import { createI18n } from "#lib/i18n/instance.js";

import { loadAccount } from "./account-route";
import { getAuthenticationContext } from "./context";
import { stubAuthenticationContext } from "./context.fixture";
import { type AuthenticatedSession, AuthenticationSession, AuthenticationUnavailableError } from "./session";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@a-novel-kit/nodelib-browser/http";
import { credentialsGetSelf } from "@a-novel/service-authentication-rest";

import type { RequestEvent } from "@sveltejs/kit";

vi.mock("./context", () => ({ getAuthenticationContext: vi.fn() }));
vi.mock("@a-novel/service-authentication-rest", { spy: true });

const authenticated = vi.spyOn(AuthenticationSession.prototype, "authenticated");

const signedIn: AuthenticatedSession = {
  status: "available",
  accessToken: "fixture-access",
  claims: { userID: "test-user", refreshTokenID: "test-refresh", roles: [] },
};

function event(): RequestEvent {
  return {
    url: new URL("https://template.test/account"),
    locals: { locale: "en", i18n: createI18n("en") },
    cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  } as unknown as RequestEvent;
}

describe("account route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const request = event();
    vi.mocked(getAuthenticationContext).mockReturnValue(stubAuthenticationContext(request.cookies, request.url));
  });

  it("limits a retrieval failure to the recap and keeps logout usable", async () => {
    authenticated.mockRejectedValue(new AuthenticationUnavailableError());
    await expect(loadAccount(event())).resolves.toEqual({
      authorization: "unavailable",
      accountModel: {
        claims: { status: "error", feedback: "sessionUnavailable" },
        credentials: { status: "unavailable" },
        logoutState: "ready",
      },
    });
  });

  it("shows the account email and its pending change, and names the shell after that email", async () => {
    const request = event();
    vi.mocked(getAuthenticationContext).mockReturnValue(stubAuthenticationContext(request.cookies, request.url));
    authenticated.mockResolvedValue(signedIn);
    const expiresAt = new Date("2026-08-18T20:30:00Z");
    vi.mocked(credentialsGetSelf).mockResolvedValue({
      id: "test-user",
      email: "creator@example.test",
      role: "auth:user",
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-01T10:00:00Z"),
      pendingEmail: { email: "new@example.test", expiresAt },
    });

    const { accountModel } = await loadAccount(request);

    expect(credentialsGetSelf).toHaveBeenCalledWith(expect.anything(), "fixture-access");
    expect(accountModel.credentials).toEqual({
      status: "ready",
      email: "creator@example.test",
      pendingEmail: {
        email: "new@example.test",
        expiresAt: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(expiresAt),
      },
    });
    expect(request.cookies.set).toHaveBeenCalledWith("template_identity_handle", "creator", expect.anything());
  });

  it("keeps the session recap and logout when the email cannot be read", async () => {
    authenticated.mockResolvedValue(signedIn);
    vi.mocked(credentialsGetSelf).mockRejectedValue(new HttpError(500, "unavailable"));

    await expect(loadAccount(event())).resolves.toMatchObject({
      authorization: "allowed",
      accountModel: {
        claims: { status: "ready", userId: "test-user" },
        credentials: { status: "unavailable" },
        logoutState: "ready",
      },
    });
  });

  it("redirects a definitively anonymous request to login", async () => {
    authenticated.mockResolvedValue(null);
    await expect(loadAccount(event())).rejects.toMatchObject({
      status: 303,
      location: "/?auth=login&returnTo=%2Faccount",
    });
  });
});
