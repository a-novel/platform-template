import { logoutAuthentication } from "./logout";
import { loadShell } from "./shell-layout";
import { completeSignIn, startSignIn } from "./sign-in";

import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@a-novel/service-authentication-rest";

import type { Cookies, RequestEvent } from "@sveltejs/kit";

const env = vi.hoisted(() => ({
  ACCOUNT_URL: "https://account.test",
  AUTHENTICATION_SERVICE_AUDIENCE: undefined,
  AUTHENTICATION_SERVICE_URL: "https://authentication.test",
  DOWNTIME_URL: undefined,
  HEALTHCHECK_TIMEOUT_MS: undefined,
  SERVICE_TOKEN_PATH: undefined,
}));

vi.mock("$app/env/private", () => env);

// The planned downtime the published document announces. A test sets one when it needs it.
const published = vi.hoisted(() => ({ downtime: null as { components: string[]; start: Date; end: Date } | null }));

vi.mock("@a-novel-kit/nodelib-server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@a-novel-kit/nodelib-server")>()),
  createDowntimeReader: () => async () => published.downtime,
}));

const fetchService = vi.fn<typeof fetch>();

/** The last authentication call as the service receives it, after the platform's fetch wrapper. */
function sentRequest() {
  const [url, init] = fetchService.mock.lastCall ?? [];
  return { url, method: init?.method, headers: Object.fromEntries(new Headers(init?.headers)), body: init?.body };
}

const userId = "140f24ee-1531-4a9d-ace8-20b38e1b21bc";
const identity = { userID: userId, roles: [Role.User], clientID: "template" };
const tokenCookies = { template_access_token: "private-access", template_refresh_token: "private-refresh" };
const accountLinks = {
  accountHref: "https://account.test/account",
  invitationHref: "https://account.test/?auth=register",
};

function request(path: string, cookieValues: Record<string, string> = {}) {
  const values = new Map(Object.entries(cookieValues));
  const cookies = {
    get: vi.fn((name: string) => values.get(name)),
    set: vi.fn<Cookies["set"]>((name, value) => {
      values.set(name, value);
    }),
    delete: vi.fn<Cookies["delete"]>((name) => {
      values.delete(name);
    }),
  };
  const url = new URL(path, "https://template.test");
  const event = { cookies, getClientAddress: () => "192.0.2.1", url } as unknown as RequestEvent;
  return { event, cookies, values };
}

beforeEach(() => {
  env.AUTHENTICATION_SERVICE_URL = "https://authentication.test";
  fetchService.mockReset().mockRejectedValue(new Error("Unexpected authentication request"));
  vi.stubGlobal("fetch", fetchService);
});

afterEach(() => {
  vi.unstubAllGlobals();
  published.downtime = null;
});

describe("session at the request boundary", () => {
  it("serves an anonymous home without calling authentication", async () => {
    const { event } = request("/");
    await expect(loadShell(event)).resolves.toEqual({
      activeNavigation: "home",
      ...accountLinks,
      session: { status: "anonymous" },
      authorization: "anonymous",
    });
    expect(fetchService).not.toHaveBeenCalled();
  });

  it("exposes only a verified display identity to the browser", async () => {
    const { event } = request("/account", { ...tokenCookies, template_identity_handle: "maya.chen" });
    fetchService.mockResolvedValueOnce(Response.json(identity));
    await expect(loadShell(event)).resolves.toEqual({
      activeNavigation: null,
      ...accountLinks,
      session: { status: "authenticated", displayName: "Maya Chen", initials: "MC" },
      authorization: "allowed",
    });
    expect(fetchService).toHaveBeenCalledOnce();
    expect(sentRequest()).toEqual({
      url: "https://authentication.test/v2/session",
      method: "GET",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer private-access",
        "x-client-ip": "192.0.2.1",
      },
    });
  });

  it("checks the session once for the loads of one request", async () => {
    const { event } = request("/", tokenCookies);
    fetchService.mockImplementation(async () => Response.json(identity));

    await Promise.all([loadShell(event), loadShell(event)]);

    expect(fetchService.mock.calls.map(([url]) => url)).toEqual(["https://authentication.test/v2/session"]);
  });

  it("keeps anonymous service claims out of authenticated UI", async () => {
    const { event } = request("/", tokenCookies);
    fetchService.mockResolvedValueOnce(Response.json({ roles: [Role.Anon] }));
    await expect(loadShell(event)).resolves.toMatchObject({
      session: { status: "anonymous" },
      authorization: "anonymous",
    });
  });

  it("renders an unavailable session when runtime configuration is missing", async () => {
    env.AUTHENTICATION_SERVICE_URL = "";
    const { event } = request("/", tokenCookies);
    await expect(loadShell(event)).resolves.toEqual({
      activeNavigation: "home",
      accountHref: null,
      invitationHref: null,
      session: { status: "error" },
      authorization: "unavailable",
    });
    expect(fetchService).not.toHaveBeenCalled();
  });

  it("preserves a recoverable session when refresh fails during an outage", async () => {
    const { event, values, cookies } = request("/", tokenCookies);
    fetchService
      .mockResolvedValueOnce(new Response("expired", { status: 401 }))
      .mockResolvedValueOnce(new Response("private service detail", { status: 503 }));
    await expect(loadShell(event)).resolves.toEqual({
      activeNavigation: "home",
      ...accountLinks,
      session: { status: "error" },
      authorization: "unavailable",
    });
    expect(sentRequest()).toEqual({
      url: "https://authentication.test/v2/oauth/token",
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-client-ip": "192.0.2.1" },
      body: expect.anything(),
    });
    expect(Object.fromEntries(new URLSearchParams(String(fetchService.mock.lastCall?.[1]?.body)))).toEqual({
      grant_type: "refresh_token",
      refresh_token: "private-refresh",
    });
    expect(Object.fromEntries(values)).toEqual(tokenCookies);
    expect(cookies.set).not.toHaveBeenCalled();
    expect(cookies.delete).not.toHaveBeenCalled();
  });

  it("ends the session on every platform at the service on logout", async () => {
    const { event, values } = request("/auth/logout", tokenCookies);
    fetchService
      .mockResolvedValueOnce(Response.json(identity))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(logoutAuthentication(event)).rejects.toMatchObject({ status: 303, location: "/" });
    expect(sentRequest()).toEqual({
      url: "https://authentication.test/v2/session/revoke",
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer private-access",
        "x-client-ip": "192.0.2.1",
      },
      body: JSON.stringify({ refreshToken: "private-refresh" }),
    });
    expect(values.size).toBe(0);
  });

  it("logs out locally even while authentication is unreachable", async () => {
    const { event, values, cookies } = request("/auth/logout?returnTo=https://attacker.invalid", {
      ...tokenCookies,
      template_identity_handle: "maya.chen",
    });
    await expect(logoutAuthentication(event)).rejects.toMatchObject({ status: 303, location: "/" });
    expect(values.size).toBe(0);
    expect(cookies.delete.mock.calls).toEqual([
      ["template_access_token", { path: "/" }],
      ["template_refresh_token", { path: "/" }],
      ["template_identity_handle", { path: "/" }],
    ]);
    // The unreachable session check leaves nothing to revoke.
    expect(fetchService).toHaveBeenCalledOnce();
  });
});

/** Starts a sign-in and returns the redirect, the pending sign-in it keeps and that cookie's value. */
async function startedSignIn(path = "/auth/sign-in?returnTo=%2Fprivacy%3Fpanel%3Dtelemetry") {
  const { event, cookies, values } = request(path);
  const redirect = await startSignIn(event).catch((thrown: unknown) => thrown as { status: number; location: string });
  const cookie = values.get("template_sign_in") ?? "";

  return {
    redirect,
    cookie,
    options: cookies.set.mock.lastCall?.[2],
    pending: JSON.parse(cookie) as { state: string; verifier: string; returnTo: string },
    authorization: new URL(redirect.location),
  };
}

/** The callback request that brings an authorization response back to the platform. */
function callback(response: Record<string, string | string[]>, signIn?: string) {
  const parameters = new URLSearchParams();
  for (const [name, values] of Object.entries(response)) {
    for (const value of [values].flat()) parameters.append(name, value);
  }
  return request(`/auth/callback?${parameters}`, signIn === undefined ? {} : { template_sign_in: signIn });
}

const tokenResponse = {
  access_token: "new-access",
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: "new-refresh",
};
const selfCredentials = {
  id: userId,
  email: "maya.chen@example.com",
  role: Role.User,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

describe("sign-in through the account platform at the request boundary", () => {
  it("sends the visitor to the account platform with a fresh state and an S256 PKCE challenge", async () => {
    const { redirect, options, pending, authorization } = await startedSignIn();

    expect(redirect.status).toBe(303);
    expect(authorization.origin + authorization.pathname).toBe("https://account.test/authorize");
    expect(Object.fromEntries(authorization.searchParams)).toEqual({
      response_type: "code",
      client_id: "template",
      redirect_uri: "https://template.test/auth/callback",
      state: pending.state,
      code_challenge: createHash("sha256").update(pending.verifier).digest("base64url"),
      code_challenge_method: "S256",
    });
    expect(pending.returnTo).toBe("/privacy?panel=telemetry");
    expect(pending.state).toMatch(/^[\w-]{43}$/);
    expect(pending.verifier).toMatch(/^[\w-]{43}$/);
    expect(options).toEqual({ httpOnly: true, path: "/auth/callback", sameSite: "lax", secure: true, maxAge: 600 });
    expect(fetchService).not.toHaveBeenCalled();

    const another = await startedSignIn();
    expect(another.pending.state).not.toBe(pending.state);
    expect(another.pending.verifier).not.toBe(pending.verifier);
  });

  it.each(["https://attacker.invalid/", "/auth/logout"])("returns to the home page instead of %s", async (target) => {
    const { pending } = await startedSignIn(`/auth/sign-in?returnTo=${encodeURIComponent(target)}`);
    expect(pending.returnTo).toBe("/");
  });

  it("exchanges the code with its verifier, keeps the tokens and returns the visitor without a referrer", async () => {
    const { cookie, pending } = await startedSignIn();
    const { event, cookies, values } = callback(
      { code: "private-code", state: pending.state, iss: "https://account.test" },
      cookie
    );
    fetchService
      .mockResolvedValueOnce(Response.json(tokenResponse))
      .mockResolvedValueOnce(Response.json(selfCredentials));

    const response = await completeSignIn(event);

    expect(response.status).toBe(303);
    expect(Object.fromEntries(response.headers)).toEqual({
      location: "/privacy?panel=telemetry",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    });
    const [tokenUrl, tokenRequest] = fetchService.mock.calls[0] ?? [];
    const [selfUrl, selfRequest] = fetchService.mock.calls[1] ?? [];
    expect([tokenUrl, tokenRequest?.method]).toEqual(["https://authentication.test/v2/oauth/token", "POST"]);
    expect(Object.fromEntries(new Headers(tokenRequest?.headers))).toEqual({
      "content-type": "application/x-www-form-urlencoded",
      "x-client-ip": "192.0.2.1",
    });
    expect(Object.fromEntries(new URLSearchParams(String(tokenRequest?.body)))).toEqual({
      grant_type: "authorization_code",
      code: "private-code",
      code_verifier: pending.verifier,
      redirect_uri: "https://template.test/auth/callback",
    });
    // The new access token reads the account's email once, which names the visitor in the shell.
    expect([selfUrl, new Headers(selfRequest?.headers).get("authorization")]).toEqual([
      "https://authentication.test/v2/credentials/self",
      "Bearer new-access",
    ]);
    expect(Object.fromEntries(values)).toEqual({
      template_access_token: "new-access",
      template_refresh_token: "new-refresh",
      template_identity_handle: "maya.chen",
    });
    expect(cookies.delete).toHaveBeenCalledWith("template_sign_in", { path: "/auth/callback" });
  });

  it("completes the sign-in without a name when Authentication keeps the account from the platform", async () => {
    const { cookie, pending } = await startedSignIn();
    const { event, values } = callback({ code: "c", state: pending.state, iss: "https://account.test" }, cookie);
    fetchService
      .mockResolvedValueOnce(Response.json(tokenResponse))
      .mockResolvedValueOnce(new Response("client token", { status: 403 }));

    const response = await completeSignIn(event);

    expect(response.headers.get("location")).toBe("/privacy?panel=telemetry");
    expect(Object.fromEntries(values)).toEqual({
      template_access_token: "new-access",
      template_refresh_token: "new-refresh",
    });
  });

  const refusedResponses: Array<[string, (pending: { state: string }) => Record<string, string | string[]>]> = [
    ["another state", () => ({ code: "c", state: "forged", iss: "https://account.test" })],
    ["a repeated state", ({ state }) => ({ code: "c", state: [state, state], iss: "https://account.test" })],
    ["no issuer", ({ state }) => ({ code: "c", state })],
    ["another issuer", ({ state }) => ({ code: "c", state, iss: "https://attacker.invalid" })],
    ["no code", ({ state }) => ({ state, iss: "https://account.test" })],
    ["a refusal", ({ state }) => ({ error: "invalid_request", state, iss: "https://account.test" })],
  ];

  it.each(refusedResponses)("fails a response with %s without exchanging anything", async (_, response) => {
    const { cookie, pending } = await startedSignIn();
    const { event, cookies, values } = callback(response(pending), cookie);

    const result = await completeSignIn(event);

    expect(result.headers.get("location")).toBe("/auth/sign-in/failed?returnTo=%2Fprivacy%3Fpanel%3Dtelemetry");
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    expect(fetchService).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
    expect(cookies.delete).toHaveBeenCalledWith("template_sign_in", { path: "/auth/callback" });
  });

  it.each([
    ["no sign-in was started", undefined],
    ["the pending sign-in is malformed", "{not json"],
    ["the pending sign-in misses its verifier", JSON.stringify({ state: "s", returnTo: "/privacy" })],
  ])("fails a response toward the home page when %s", async (_, signIn) => {
    const { event } = callback({ code: "c", state: "s", iss: "https://account.test" }, signIn);

    const result = await completeSignIn(event);

    expect(result.headers.get("location")).toBe("/auth/sign-in/failed?returnTo=%2F");
    expect(fetchService).not.toHaveBeenCalled();
  });

  it.each(["temporarily_unavailable", "server_error"])("asks to retry later after a %s refusal", async (error) => {
    const { cookie, pending } = await startedSignIn();
    const { event } = callback({ error, state: pending.state, iss: "https://account.test" }, cookie);

    const result = await completeSignIn(event);

    expect(result.headers.get("location")).toBe(
      "/auth/sign-in/failed?returnTo=%2Fprivacy%3Fpanel%3Dtelemetry&reason=unavailable"
    );
    expect(fetchService).not.toHaveBeenCalled();
  });

  const failedExchanges: Array<[string, () => Promise<Response>, string]> = [
    ["a refused code", async () => Response.json({ error: "invalid_grant" }, { status: 400 }), ""],
    ["a rate limit", async () => new Response("slow down", { status: 429 }), "&reason=rate-limited"],
    ["an outage", async () => new Response("private service detail", { status: 503 }), "&reason=unavailable"],
    ["a rejected service token", async () => new Response(null, { status: 401 }), "&reason=unavailable"],
    ["an unreachable service", async () => Promise.reject(new Error("network unavailable")), "&reason=unavailable"],
  ];

  it.each(failedExchanges)("keeps the visitor signed out after %s", async (_, answer, reason) => {
    const { cookie, pending } = await startedSignIn();
    const { event, values } = callback({ code: "c", state: pending.state, iss: "https://account.test" }, cookie);
    fetchService.mockImplementationOnce(answer);

    const result = await completeSignIn(event);

    expect(result.headers.get("location")).toBe(
      `/auth/sign-in/failed?returnTo=%2Fprivacy%3Fpanel%3Dtelemetry${reason}`
    );
    expect(fetchService).toHaveBeenCalledOnce();
    expect(values.size).toBe(0);
  });
});

describe("planned downtime at the request boundary", () => {
  const started = () => ({
    components: ["service-json-keys.database"],
    start: new Date(Date.now() - 60_000),
    end: new Date(Date.now() + 3_600_000),
  });
  const downtimeRefusal = { status: 503, body: { message: "Planned downtime", downtime: true } };

  it("shows a maintenance session without calling authentication once a downtime has started", async () => {
    published.downtime = started();
    const { event } = request("/", { template_access_token: "access", template_refresh_token: "refresh" });

    await expect(loadShell(event)).resolves.toEqual({
      activeNavigation: "home",
      ...accountLinks,
      session: { status: "downtime" },
      authorization: "unavailable",
    });
    expect(fetchService).not.toHaveBeenCalled();
  });

  it("refuses to start a sign-in, and leaves no pending sign-in behind", async () => {
    published.downtime = started();
    const { event, cookies } = request("/auth/sign-in?returnTo=%2Fprivacy");

    await expect(startSignIn(event)).rejects.toMatchObject(downtimeRefusal);
    expect(cookies.set).not.toHaveBeenCalled();
    expect(fetchService).not.toHaveBeenCalled();
  });

  it("locks nothing before the start, or for a service the platform doesn't use", async () => {
    const inactive = [
      { ...started(), start: new Date(Date.now() + 60_000) },
      { ...started(), components: ["service-genai.database"] },
    ];
    for (const downtime of inactive) {
      published.downtime = downtime;

      await expect(loadShell(request("/").event)).resolves.toMatchObject({ session: { status: "anonymous" } });
    }
  });

  it("treats a downtime refusal from authentication as maintenance before the document announces it", async () => {
    // A fresh response per call, since a body can only be read once.
    fetchService.mockImplementation(async () =>
      Response.json(
        { type: "about:blank", title: "Service Unavailable", status: 503, tags: { downtime: true } },
        { status: 503, headers: { "Content-Type": "application/problem+json" } }
      )
    );

    await expect(
      loadShell(request("/", { template_access_token: "access", template_refresh_token: "refresh" }).event)
    ).resolves.toMatchObject({ session: { status: "downtime" }, authorization: "unavailable" });
  });
});
