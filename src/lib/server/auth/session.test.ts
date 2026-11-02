import {
  AuthenticationSession,
  AuthenticationUnavailableError,
  type SessionClient,
  type SessionCookies,
} from "./session";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@a-novel-kit/nodelib-browser/http";
import { OAuthError, Role } from "@a-novel/service-authentication-rest";

type CookieSetOptions = Parameters<SessionCookies["set"]>[2];

class MemoryCookies implements SessionCookies {
  readonly values = new Map<string, string>();
  readonly writes: Array<{ name: string; options: CookieSetOptions; value: string }> = [];
  readonly deletions: string[] = [];

  get(name: string): string | undefined {
    return this.values.get(name);
  }

  set(name: string, value: string, options: CookieSetOptions): void {
    this.values.set(name, value);
    this.writes.push({ name, options, value });
  }

  delete(name: string): void {
    this.values.delete(name);
    this.deletions.push(name);
  }
}

function createClient(): {
  [Key in keyof SessionClient]: ReturnType<typeof vi.fn<SessionClient[Key]>>;
} {
  return {
    claims: vi.fn<SessionClient["claims"]>(),
    email: vi.fn<SessionClient["email"]>(),
    exchange: vi.fn<SessionClient["exchange"]>(),
    refresh: vi.fn<SessionClient["refresh"]>(),
    revoke: vi.fn<SessionClient["revoke"]>(),
  };
}

/** A token response of Authentication's token endpoint. A refresh carries no refresh token. */
function tokenResponse(accessToken: string, refreshToken?: string) {
  return { access_token: accessToken, token_type: "Bearer", expires_in: 3600, refresh_token: refreshToken };
}

function oauthError(error: string) {
  return new OAuthError("refused", { error });
}

const grant = { code: "code", code_verifier: "verifier", redirect_uri: "https://template.test/auth/callback" };

describe("AuthenticationSession", () => {
  let client: ReturnType<typeof createClient>;
  let cookies: MemoryCookies;

  beforeEach(() => {
    client = createClient();
    cookies = new MemoryCookies();
  });

  it("asks Authentication nothing for a visitor without cookies", async () => {
    const session = new AuthenticationSession(client, cookies, new URL("http://template.test/"));

    await expect(session.current()).resolves.toEqual({ status: "none" });
    expect(client.claims).not.toHaveBeenCalled();
  });

  it("returns verified authenticated claims without exposing cookies to the browser", async () => {
    cookies.values.set("template_access_token", "access");
    cookies.values.set("template_refresh_token", "refresh");
    cookies.values.set("template_identity_handle", "maya.chen");
    client.claims.mockResolvedValue({
      userID: "140f24ee-1531-4a9d-ace8-20b38e1b21bc",
      roles: [Role.User],
      refreshTokenID: "refresh-id",
      clientID: "template",
    });
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.authenticated()).resolves.toMatchObject({
      status: "available",
      accessToken: "access",
      refreshToken: "refresh",
      identityHandle: "maya.chen",
      claims: { roles: [Role.User] },
    });
  });

  it("keeps the token pair of an exchanged code and the email's handle in secure HTTP-only cookies", async () => {
    client.exchange.mockResolvedValue(tokenResponse("access", "refresh"));
    client.email.mockResolvedValue("maya.chen@example.com");
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.signIn(grant);

    expect(client.exchange).toHaveBeenCalledExactlyOnceWith(grant);
    expect(client.email).toHaveBeenCalledExactlyOnceWith("access");
    expect(Object.fromEntries(cookies.values)).toEqual({
      template_access_token: "access",
      template_refresh_token: "refresh",
      template_identity_handle: "maya.chen",
    });
    for (const { options } of cookies.writes) {
      expect(options).toEqual({ httpOnly: true, path: "/", sameSite: "lax", secure: true });
    }
  });

  it("signs in without a name, and forgets a former one, when the email cannot be read", async () => {
    cookies.values.set("template_identity_handle", "former.visitor");
    client.exchange.mockResolvedValue(tokenResponse("access", "refresh"));
    client.email.mockRejectedValue(new HttpError(403, "client token"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.signIn(grant);

    expect(Object.fromEntries(cookies.values)).toEqual({
      template_access_token: "access",
      template_refresh_token: "refresh",
    });
  });

  it("keeps the cookies as they were when Authentication refuses the code", async () => {
    cookies.values.set("template_access_token", "previous-access");
    client.exchange.mockRejectedValue(oauthError("invalid_grant"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.signIn(grant)).rejects.toBeInstanceOf(OAuthError);
    expect(cookies.writes).toHaveLength(0);
    expect(cookies.deletions).toHaveLength(0);
  });

  it("shares one session check between the concurrent loads of a request", async () => {
    cookies.values.set("template_access_token", "access");
    client.claims.mockResolvedValue({ roles: [Role.User], userID: "test-user" });
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    const [shell, page] = await Promise.all([session.current(), session.authenticated()]);

    expect(shell).toMatchObject({ status: "available", accessToken: "access" });
    expect(page).toMatchObject({ status: "available", accessToken: "access" });
    expect(client.claims).toHaveBeenCalledOnce();
  });

  it("checks the session again once its cookies change", async () => {
    cookies.values.set("template_access_token", "access");
    client.claims.mockResolvedValue({ roles: [Role.User], userID: "test-user" });
    client.exchange.mockResolvedValue(tokenResponse("new-access", "new-refresh"));
    client.email.mockResolvedValue("maya.chen@example.com");
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.current();
    await session.signIn(grant);

    await expect(session.current()).resolves.toMatchObject({ accessToken: "new-access" });
    expect(client.claims).toHaveBeenCalledTimes(2);
  });

  it("does not treat anonymous claims as an authenticated identity", async () => {
    cookies.values.set("template_access_token", "anonymous-access");
    client.claims.mockResolvedValue({ roles: [] });
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.authenticated()).resolves.toBeNull();
    expect(cookies.values.get("template_access_token")).toBe("anonymous-access");
  });

  it("refreshes a rejected access token at the token endpoint and keeps the refresh token", async () => {
    cookies.values.set("template_access_token", "expired-access");
    cookies.values.set("template_refresh_token", "refresh");
    client.claims.mockRejectedValueOnce(new HttpError(401, "expired")).mockResolvedValueOnce({
      userID: "140f24ee-1531-4a9d-ace8-20b38e1b21bc",
      roles: [Role.User],
    });
    client.refresh.mockResolvedValue(tokenResponse("fresh-access"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.current()).resolves.toMatchObject({
      status: "available",
      accessToken: "fresh-access",
      refreshToken: "refresh",
    });
    expect(client.refresh).toHaveBeenCalledExactlyOnceWith("refresh");
    expect(Object.fromEntries(cookies.values)).toEqual({
      template_access_token: "fresh-access",
      template_refresh_token: "refresh",
    });
  });

  it("signs the visitor out once the session ended or was signed out on another platform", async () => {
    cookies.values.set("template_access_token", "expired-access");
    cookies.values.set("template_refresh_token", "revoked-refresh");
    client.claims.mockRejectedValue(new HttpError(401, "signed out"));
    client.refresh.mockRejectedValue(oauthError("invalid_grant"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.current()).resolves.toEqual({ status: "none" });
    expect(cookies.values.size).toBe(0);
  });

  it.each(["invalid_client", "invalid_request", "unsupported_grant_type"])(
    "keeps the cookies when the token endpoint refuses the platform with %s",
    async (error) => {
      cookies.values.set("template_access_token", "expired-access");
      cookies.values.set("template_refresh_token", "refresh");
      client.claims.mockRejectedValue(new HttpError(401, "expired"));
      client.refresh.mockRejectedValue(oauthError(error));
      const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

      await expect(session.current()).resolves.toEqual({ status: "unavailable" });
      expect(cookies.deletions).toHaveLength(0);
    }
  );

  it.each(["template_refresh_token", "template_identity_handle"])(
    "clears a stale %s when the access token is missing",
    async (name) => {
      cookies.values.set(name, "stale-cookie");
      const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

      await expect(session.current()).resolves.toEqual({ status: "none" });
      expect(cookies.values.size).toBe(0);
      expect(client.claims).not.toHaveBeenCalled();
      expect(client.refresh).not.toHaveBeenCalled();
    }
  );

  it.each(["maya.chen@example.com", "a".repeat(65)])("shows no name for the malformed handle %s", async (handle) => {
    cookies.values.set("template_access_token", "access");
    cookies.values.set("template_identity_handle", handle);
    client.claims.mockResolvedValue({ roles: [Role.User], userID: "test-user" });
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.current()).resolves.toMatchObject({ status: "available", identityHandle: undefined });
  });

  it.each([401, 403])("clears an access token rejected with %s when it cannot be refreshed", async (status) => {
    cookies.values.set("template_access_token", "expired-access");
    client.claims.mockRejectedValue(new HttpError(status, "expired"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.current()).resolves.toEqual({ status: "none" });
    expect(cookies.values.size).toBe(0);
    expect(client.refresh).not.toHaveBeenCalled();
  });

  it("does not store a refreshed token whose claims cannot be verified", async () => {
    cookies.values.set("template_access_token", "expired-access");
    cookies.values.set("template_refresh_token", "refresh");
    client.claims.mockRejectedValue(new HttpError(401, "invalid claims"));
    client.refresh.mockResolvedValue(tokenResponse("unverified-access"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.current()).resolves.toEqual({ status: "none" });
    expect(client.claims).toHaveBeenLastCalledWith("unverified-access");
    expect(cookies.writes).toHaveLength(0);
    expect(cookies.values.size).toBe(0);
  });

  it("does not turn an authentication outage into an anonymous session", async () => {
    cookies.values.set("template_access_token", "access");
    client.claims.mockRejectedValue(new Error("network unavailable"));
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await expect(session.authenticated()).rejects.toBeInstanceOf(AuthenticationUnavailableError);
    expect(cookies.values.get("template_access_token")).toBe("access");
  });

  it("ends the session on every platform before removing every cookie on logout", async () => {
    cookies.values.set("template_access_token", "access");
    cookies.values.set("template_refresh_token", "refresh");
    cookies.values.set("template_identity_handle", "maya.chen");
    client.claims.mockResolvedValue({ roles: [Role.User], userID: "test-user" });
    client.revoke.mockResolvedValue();
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.logout();

    expect(client.revoke).toHaveBeenCalledWith("access", "refresh");
    expect(cookies.values.size).toBe(0);
  });

  it("refreshes an expired session before revoking it on logout", async () => {
    cookies.values.set("template_access_token", "expired-access");
    cookies.values.set("template_refresh_token", "refresh");
    client.claims
      .mockRejectedValueOnce(new HttpError(401, "expired"))
      .mockResolvedValueOnce({ roles: [Role.User], userID: "test-user" });
    client.refresh.mockResolvedValue(tokenResponse("fresh-access"));
    client.revoke.mockResolvedValue();
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.logout();

    expect(client.revoke).toHaveBeenCalledWith("fresh-access", "refresh");
    expect(cookies.values.size).toBe(0);
  });

  it.each([
    ["the revocation fails", new HttpError(503, "unavailable")],
    ["authentication is unreachable", new Error("network unavailable")],
  ])("still signs out of the browser when %s", async (_, error) => {
    cookies.values.set("template_access_token", "access");
    cookies.values.set("template_refresh_token", "refresh");
    client.claims.mockResolvedValue({ roles: [Role.User], userID: "test-user" });
    client.revoke.mockRejectedValue(error);
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.logout();

    expect(cookies.values.size).toBe(0);
  });

  it.each([
    ["an anonymous session", () => client.claims.mockResolvedValue({ roles: [Role.Anon] })],
    ["an unverifiable session", () => client.claims.mockRejectedValue(new Error("network unavailable"))],
  ])("clears %s on logout without revoking it", async (_, arrange) => {
    cookies.values.set("template_access_token", "access");
    arrange();
    const session = new AuthenticationSession(client, cookies, new URL("https://template.test/"));

    await session.logout();

    expect(client.revoke).not.toHaveBeenCalled();
    expect(cookies.values.size).toBe(0);
  });

  it("drops the secure flag only on plain HTTP, for local stacks", async () => {
    client.exchange.mockResolvedValue(tokenResponse("access", "refresh"));
    client.email.mockResolvedValue("maya.chen@example.com");
    const session = new AuthenticationSession(client, cookies, new URL("http://127.0.0.1:4173/"));

    await session.signIn(grant);

    expect(cookies.writes.map(({ options }) => options?.secure)).toEqual([false, false, false]);
  });
});
