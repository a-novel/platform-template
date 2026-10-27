import { createI18n } from "#lib/i18n/instance.js";

import { loadAccount } from "./account-route";
import { authenticationActions } from "./authentication-route";
import { logoutAuthentication } from "./logout";
import { loadShell } from "./shell-layout";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@a-novel/service-authentication-rest";

import type { Cookies, RequestEvent } from "@sveltejs/kit";

const env = vi.hoisted(() => ({
  AUTHENTICATION_SERVICE_AUDIENCE: undefined,
  AUTHENTICATION_SERVICE_URL: "https://authentication.test",
  DOWNTIME_URL: undefined,
  HEALTHCHECK_TIMEOUT_MS: undefined,
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
const identity = { userID: userId, roles: [Role.User] };
const tokenCookies = { template_access_token: "private-access", template_refresh_token: "private-refresh" };

function request(path: string, cookieValues: Record<string, string> = {}, fields?: Record<string, string>) {
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
  const event = {
    cookies,
    getClientAddress: () => "192.0.2.1",
    url,
    locals: { locale: "fr", i18n: createI18n("fr") },
    request: new Request(url, fields ? { method: "POST", body: new URLSearchParams(fields) } : undefined),
  } as unknown as RequestEvent;
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

  it("checks the session once for the shell and page loads of one request", async () => {
    const { event } = request("/account", tokenCookies);
    fetchService.mockImplementation(async () => Response.json(identity));

    await Promise.all([loadShell(event), loadAccount(event)]);

    expect(fetchService).toHaveBeenCalledOnce();
  });

  it("uses a localized account label when the identity cookie contains a full email", async () => {
    const { event } = request("/", { ...tokenCookies, template_identity_handle: "maya.chen@example.com" });
    fetchService.mockResolvedValueOnce(Response.json(identity));
    await expect(loadShell(event)).resolves.toMatchObject({
      session: { status: "authenticated", displayName: "Compte", initials: "A" },
    });
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
    await expect(loadShell(event)).resolves.toMatchObject({
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
      session: { status: "error" },
      authorization: "unavailable",
    });
    expect(sentRequest()).toEqual({
      url: "https://authentication.test/v2/session",
      method: "PATCH",
      headers: { "content-type": "application/json", "x-client-ip": "192.0.2.1" },
      body: expect.any(String),
    });
    expect(JSON.parse(fetchService.mock.lastCall?.[1]?.body as string)).toEqual({
      accessToken: "private-access",
      refreshToken: "private-refresh",
    });
    expect(Object.fromEntries(values)).toEqual(tokenCookies);
    expect(cookies.set).not.toHaveBeenCalled();
    expect(cookies.delete).not.toHaveBeenCalled();
  });

  it("logs in through the service and stores credentials only in secure cookies", async () => {
    const { event, cookies, values } = request(
      "/?auth=login&returnTo=%2Faccount",
      {},
      {
        email: "maya.chen@example.com",
        password: "private-password",
      }
    );
    fetchService.mockResolvedValueOnce(Response.json({ accessToken: "new-access", refreshToken: "new-refresh" }));
    await expect(authenticationActions.default(event)).rejects.toMatchObject({ status: 303, location: "/account" });
    expect(fetchService).toHaveBeenCalledOnce();
    expect(sentRequest()).toEqual({
      url: "https://authentication.test/v2/session",
      method: "PUT",
      headers: { "content-type": "application/json", "x-client-ip": "192.0.2.1" },
      body: expect.any(String),
    });
    expect(JSON.parse(fetchService.mock.lastCall?.[1]?.body as string)).toEqual({
      email: "maya.chen@example.com",
      password: "private-password",
    });
    expect(Object.fromEntries(values)).toEqual({
      template_access_token: "new-access",
      template_refresh_token: "new-refresh",
      template_identity_handle: "maya.chen",
    });
    for (const [, , options] of cookies.set.mock.calls) {
      expect(options).toEqual({ httpOnly: true, path: "/", sameSite: "lax", secure: true });
    }
  });

  it("revokes the refresh token at the service on logout", async () => {
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

  it("returns an account recap without serializing access or refresh credentials", async () => {
    const { event } = request("/account", tokenCookies);
    fetchService.mockResolvedValueOnce(Response.json(identity));
    await expect(loadAccount(event)).resolves.toEqual({
      authorization: "allowed",
      accountModel: {
        claims: {
          status: "ready",
          userId,
          roles: [Role.User],
          accessExpiresAt: "Non renseignée",
          refreshExpiresAt: "Non renseignée",
        },
        logoutState: "ready",
      },
    });
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
      session: { status: "downtime" },
      authorization: "unavailable",
    });
    expect(fetchService).not.toHaveBeenCalled();
  });

  it("refuses sign-in and the account without calling authentication", async () => {
    published.downtime = started();

    await expect(
      authenticationActions.default(request("/?auth=login", {}, { email: "a@b.test", password: "p" }).event)
    ).rejects.toMatchObject(downtimeRefusal);
    await expect(loadAccount(request("/account", { template_access_token: "access" }).event)).rejects.toMatchObject(
      downtimeRefusal
    );
    expect(fetchService).not.toHaveBeenCalled();
  });

  it("locks nothing before the start, or for a service the platform doesn't use", async () => {
    const inactive = [
      { ...started(), start: new Date(Date.now() + 60_000) },
      { ...started(), components: ["service-genai.database"] },
    ];
    for (const downtime of inactive) {
      published.downtime = downtime;

      await expect(
        authenticationActions.default(request("/?auth=login", {}, { email: "invalid", password: "" }).event)
      ).resolves.toMatchObject({ status: 400 });
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
    await expect(loadAccount(request("/account", { template_access_token: "access" }).event)).rejects.toMatchObject(
      downtimeRefusal
    );
  });
});
