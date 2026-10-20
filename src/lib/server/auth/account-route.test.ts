import { createI18n } from "#lib/i18n/instance.js";

import { loadAccount } from "./account-route";
import { createAuthenticationContext } from "./context";
import { stubAuthenticationContext } from "./context.fixture";
import { AuthenticationSession, AuthenticationUnavailableError } from "./session";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RequestEvent } from "@sveltejs/kit";

vi.mock("./context", () => ({ createAuthenticationContext: vi.fn() }));

const authenticated = vi.spyOn(AuthenticationSession.prototype, "authenticated");

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
    vi.mocked(createAuthenticationContext).mockReturnValue(stubAuthenticationContext(request.cookies, request.url));
  });

  it("limits a retrieval failure to the recap and keeps logout usable", async () => {
    authenticated.mockRejectedValue(new AuthenticationUnavailableError());
    await expect(loadAccount(event())).resolves.toEqual({
      authorization: "unavailable",
      accountModel: {
        claims: { status: "error", feedback: "sessionUnavailable" },
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
