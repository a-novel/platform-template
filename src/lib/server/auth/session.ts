import { isDowntimeError, isHttpStatusError } from "@a-novel-kit/nodelib-browser/http";
import {
  AuthenticationApi,
  type AuthorizationCodeGrant,
  type Claims,
  OAuthError,
  type TokenResponse,
  authorizationCodeExchange,
  claimsGet,
  credentialsGetSelf,
  refreshTokenGrant,
  tokenRevoke,
} from "@a-novel/service-authentication-rest";

import type { Cookies } from "@sveltejs/kit";

const accessTokenCookie = "template_access_token";
const refreshTokenCookie = "template_refresh_token";
const identityHandleCookie = "template_identity_handle";
const rejectedSessionStatuses = [401, 403] as const;

/** SessionCookies is the part of SvelteKit's `Cookies` API the session uses. */
export interface SessionCookies {
  get(name: string): string | undefined;
  set(name: string, value: string, options: Parameters<Cookies["set"]>[2]): void;
  delete(name: string, options: Parameters<Cookies["delete"]>[1]): void;
}

/** SessionClient is the part of the authentication API the session calls. */
export interface SessionClient {
  claims(accessToken: string): Promise<Claims>;
  email(accessToken: string): Promise<string>;
  exchange(grant: AuthorizationCodeGrant): Promise<TokenResponse>;
  refresh(refreshToken: string): Promise<TokenResponse>;
  revoke(accessToken: string, refreshToken: string): Promise<void>;
}

/** ResolvedSession is what the session cookies prove about a visitor once Authentication has checked them. */
export type ResolvedSession =
  | { status: "none" }
  | { status: "unavailable" }
  | { status: "downtime" }
  | { status: "available"; accessToken: string; refreshToken?: string; identityHandle?: string; claims: Claims };
/** AuthenticatedSession is an available session that belongs to a user account. */
export type AuthenticatedSession = Omit<Extract<ResolvedSession, { status: "available" }>, "claims"> & {
  claims: Claims & { userID: string };
};

/** AuthenticationUnavailableError is thrown when Authentication cannot check a session that may be valid. */
export class AuthenticationUnavailableError extends Error {
  constructor() {
    super("The authentication service is unavailable.");
    this.name = "AuthenticationUnavailableError";
  }
}

/** AuthenticationDowntimeError is thrown when Authentication refuses a check during a planned downtime. */
export class AuthenticationDowntimeError extends Error {
  constructor() {
    super("The authentication service is in a planned downtime.");
    this.name = "AuthenticationDowntimeError";
  }
}

/**
 * AuthenticationSession keeps the token pair the platform obtained from the account platform's
 * session in HttpOnly cookies, and refreshes it on demand.
 */
export class AuthenticationSession {
  /** The session check that the loads and actions of the request share. A cookie change discards it. */
  private check?: Promise<ResolvedSession>;

  constructor(
    private readonly client: SessionClient,
    private readonly cookies: SessionCookies,
    private readonly requestUrl: URL
  ) {}

  /** Checks the session cookies, refreshing a rejected access token. An outage keeps the cookies. */
  current(): Promise<ResolvedSession> {
    this.check ??= this.resolve();
    return this.check;
  }

  private async resolve(): Promise<ResolvedSession> {
    const accessToken = this.cookies.get(accessTokenCookie);
    const refreshToken = this.cookies.get(refreshTokenCookie);

    if (!accessToken) {
      if (refreshToken || this.cookies.get(identityHandleCookie)) this.clear();
      return { status: "none" };
    }

    try {
      const claims = await this.client.claims(accessToken);
      return { status: "available", accessToken, refreshToken, identityHandle: this.readIdentityHandle(), claims };
    } catch (error) {
      if (isDowntimeError(error)) return { status: "downtime" };
      if (!isSessionRejection(error)) return { status: "unavailable" };
    }

    if (!refreshToken) {
      this.clear();
      return { status: "none" };
    }

    return await this.refresh(refreshToken);
  }

  /** Renews a rejected access token. A session that ended or was signed out signs the visitor out here too. */
  private async refresh(refreshToken: string): Promise<ResolvedSession> {
    try {
      const { access_token: accessToken } = await this.client.refresh(refreshToken);
      const claims = await this.client.claims(accessToken);
      this.accept(accessToken);

      return { status: "available", accessToken, refreshToken, identityHandle: this.readIdentityHandle(), claims };
    } catch (error) {
      if (isSessionRejection(error)) {
        this.clear();
        return { status: "none" };
      }

      return isDowntimeError(error) ? { status: "downtime" } : { status: "unavailable" };
    }
  }

  /** Returns the visitor's account session, or null for a visitor signed out. An outage throws. */
  async authenticated(): Promise<AuthenticatedSession | null> {
    const session = await this.current();

    if (session.status === "downtime") throw new AuthenticationDowntimeError();
    if (session.status === "unavailable") throw new AuthenticationUnavailableError();
    if (session.status !== "available") return null;

    const userID = session.claims.userID;
    return userID ? { ...session, claims: { ...session.claims, userID } } : null;
  }

  /**
   * Trades an authorization code from the account platform for a token pair in its session, and keeps
   * the pair with the handle of the account's email, which names the visitor in the shell. A refused
   * code throws an `OAuthError`.
   */
  async signIn(grant: AuthorizationCodeGrant): Promise<void> {
    const tokens = await this.client.exchange(grant);
    this.accept(tokens.access_token, tokens.refresh_token);

    // Without the email, the visitor is signed in all the same, and the shell names no one.
    this.rememberIdentity(await this.client.email(tokens.access_token).catch(() => ""));
  }

  /**
   * Signs the visitor out of every platform, then removes the cookies. A failed revocation still signs
   * the visitor out of this browser, which drops the tokens.
   */
  async logout(): Promise<void> {
    const session = await this.current();

    if (session.status === "available" && session.refreshToken) {
      try {
        await this.client.revoke(session.accessToken, session.refreshToken);
      } catch {
        // The session lasts until it expires. The trace records the failed call.
      }
    }

    this.clear();
  }

  /** Stores a new access token, and the refresh token when the grant issued one. Both end with the browser. */
  private accept(accessToken: string, refreshToken?: string): void {
    this.check = undefined;

    this.cookies.set(accessTokenCookie, accessToken, this.cookieOptions());
    if (refreshToken) this.cookies.set(refreshTokenCookie, refreshToken, this.cookieOptions());
  }

  /** Keeps the local part of an email address as the shell's display handle, or none for a blank one. */
  private rememberIdentity(email: string): void {
    this.check = undefined;

    const separator = email.lastIndexOf("@");
    const handle = separator > 0 ? email.slice(0, separator) : "";

    if (handle.length === 0 || handle.length > 64) {
      this.cookies.delete(identityHandleCookie, { path: "/" });
      return;
    }

    this.cookies.set(identityHandleCookie, handle, this.cookieOptions());
  }

  /** Removes every session cookie, which signs the visitor out locally. */
  private clear(): void {
    this.check = undefined;

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

/**
 * Tells whether Authentication refused the session itself. A refresh of a session that ended or was
 * signed out answers `invalid_grant`, and a refused access token 401 or 403. Any other refusal of the
 * token endpoint is a fault on the platform's side, which signing the visitor out cannot repair.
 */
function isSessionRejection(error: unknown): boolean {
  if (error instanceof OAuthError) return error.response.error === "invalid_grant";
  return isHttpStatusError(error, ...rejectedSessionStatuses);
}

/** Binds the session API to an authentication client. */
export function createSessionClient(api: AuthenticationApi): SessionClient {
  return {
    claims: async (accessToken) => await claimsGet(api, accessToken),
    email: async (accessToken) => (await credentialsGetSelf(api, accessToken)).email,
    exchange: async (grant) => await authorizationCodeExchange(api, grant),
    refresh: async (refreshToken) => await refreshTokenGrant(api, refreshToken),
    revoke: async (accessToken, refreshToken) => await tokenRevoke(api, accessToken, { refreshToken }),
  };
}
