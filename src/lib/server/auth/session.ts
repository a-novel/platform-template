import { isDowntimeError, isHttpStatusError } from "@a-novel-kit/nodelib-browser/http";
import {
  AuthenticationApi,
  type Claims,
  type Token,
  claimsGet,
  tokenCreate,
  tokenCreateAnon,
  tokenRefresh,
} from "@a-novel/service-authentication-rest";

import type { Cookies } from "@sveltejs/kit";

const accessTokenCookie = "template_access_token";
const refreshTokenCookie = "template_refresh_token";
const identityHandleCookie = "template_identity_handle";
const rejectedSessionStatuses = [401, 403] as const;

export interface SessionCookies {
  get(name: string): string | undefined;
  set(name: string, value: string, options: Parameters<Cookies["set"]>[2]): void;
  delete(name: string, options: Parameters<Cookies["delete"]>[1]): void;
}

export interface SessionClient {
  claims(accessToken: string): Promise<Claims>;
  createAnonymous(): Promise<Token>;
  login(email: string, password: string): Promise<Token>;
  refresh(token: Token): Promise<Token>;
}

export type ResolvedSession =
  | { status: "none" }
  | { status: "unavailable" }
  | { status: "downtime" }
  | {
      status: "available";
      accessToken: string;
      refreshToken?: string;
      identityHandle?: string;
      claims: Claims;
    };
export type AuthenticatedSession = Omit<Extract<ResolvedSession, { status: "available" }>, "claims"> & {
  claims: Claims & { userID: string };
};

export class AuthenticationUnavailableError extends Error {
  constructor() {
    super("The authentication service is unavailable.");
    this.name = "AuthenticationUnavailableError";
  }
}

export class AuthenticationDowntimeError extends Error {
  constructor() {
    super("The authentication service is in a planned downtime.");
    this.name = "AuthenticationDowntimeError";
  }
}

export class AuthenticationSession {
  constructor(
    private readonly client: SessionClient,
    private readonly cookies: SessionCookies,
    private readonly requestUrl: URL
  ) {}

  async current(): Promise<ResolvedSession> {
    const accessToken = this.cookies.get(accessTokenCookie);
    const refreshToken = this.cookies.get(refreshTokenCookie);

    if (!accessToken) {
      if (refreshToken || this.cookies.get(identityHandleCookie)) this.clear();
      return { status: "none" };
    }

    try {
      const claims = await this.client.claims(accessToken);
      return {
        status: "available",
        accessToken,
        refreshToken,
        identityHandle: this.readIdentityHandle(),
        claims,
      };
    } catch (error) {
      if (isDowntimeError(error)) return { status: "downtime" };
      if (!isHttpStatusError(error, ...rejectedSessionStatuses)) {
        return { status: "unavailable" };
      }
    }

    if (!refreshToken) {
      this.clear();
      return { status: "none" };
    }

    try {
      const refreshed = await this.client.refresh({ accessToken, refreshToken });
      const claims = await this.client.claims(refreshed.accessToken);
      this.accept(refreshed);

      return {
        status: "available",
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || undefined,
        identityHandle: this.readIdentityHandle(),
        claims,
      };
    } catch (error) {
      if (isHttpStatusError(error, ...rejectedSessionStatuses)) {
        this.clear();
        return { status: "none" };
      }

      return isDowntimeError(error) ? { status: "downtime" } : { status: "unavailable" };
    }
  }

  async authenticated(): Promise<AuthenticatedSession | null> {
    const session = await this.current();

    if (session.status === "downtime") throw new AuthenticationDowntimeError();
    if (session.status === "unavailable") throw new AuthenticationUnavailableError();
    if (session.status !== "available") return null;

    const userID = session.claims.userID;
    return userID ? { ...session, claims: { ...session.claims, userID } } : null;
  }

  async anonymousAccessToken(): Promise<string> {
    const session = await this.current();

    if (session.status === "downtime") throw new AuthenticationDowntimeError();
    if (session.status === "unavailable") throw new AuthenticationUnavailableError();
    if (session.status === "available") return session.accessToken;

    const token = await this.client.createAnonymous();
    this.accept(token);
    return token.accessToken;
  }

  async login(email: string, password: string): Promise<void> {
    this.accept(await this.client.login(email, password), email);
  }

  accept(token: Token, identityEmail?: string): void {
    const options = this.cookieOptions();
    // An anonymous token outlives the browser session, so a browser restart doesn't spend the
    // visitor's few anonymous tokens. A signed-in session still ends with the browser.
    const expiry = token.refreshToken ? null : readTokenExpiry(token.accessToken);
    this.cookies.set(accessTokenCookie, token.accessToken, expiry ? { ...options, expires: expiry } : options);

    if (token.refreshToken) {
      this.cookies.set(refreshTokenCookie, token.refreshToken, options);
    } else {
      this.cookies.delete(refreshTokenCookie, { path: "/" });
    }

    if (identityEmail) this.rememberIdentity(identityEmail);
  }

  rememberIdentity(email: string): void {
    const separator = email.lastIndexOf("@");
    const handle = separator > 0 ? email.slice(0, separator) : "";

    if (handle.length === 0 || handle.length > 64) {
      this.cookies.delete(identityHandleCookie, { path: "/" });
      return;
    }

    this.cookies.set(identityHandleCookie, handle, this.cookieOptions());
  }

  clear(): void {
    this.cookies.delete(accessTokenCookie, { path: "/" });
    this.cookies.delete(refreshTokenCookie, { path: "/" });
    this.cookies.delete(identityHandleCookie, { path: "/" });
  }

  private readIdentityHandle(): string | undefined {
    const handle = this.cookies.get(identityHandleCookie);
    return handle && handle.length <= 64 && !handle.includes("@") ? handle : undefined;
  }

  private cookieOptions(): Parameters<Cookies["set"]>[2] {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: this.requestUrl.protocol === "https:",
    };
  }
}

export function createSessionClient(api: AuthenticationApi): SessionClient {
  return {
    claims: async (accessToken) => await claimsGet(api, accessToken),
    createAnonymous: async () => await tokenCreateAnon(api),
    login: async (email, password) => await tokenCreate(api, { email, password }),
    refresh: async (token) => await tokenRefresh(api, token),
  };
}

export function readTokenExpiry(token: string): Date | null {
  if (token.length > 4096) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded || typeof decoded !== "object") return null;

    const expiry = (decoded as Record<string, unknown>).exp;
    if (typeof expiry !== "number" || !Number.isSafeInteger(expiry) || expiry <= 0) return null;

    const date = new Date(expiry * 1000);
    return Number.isNaN(date.valueOf()) ? null : date;
  } catch {
    return null;
  }
}
