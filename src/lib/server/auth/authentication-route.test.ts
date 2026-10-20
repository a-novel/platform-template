import { authenticationActions } from "./authentication-route";
import { createAuthenticationContext } from "./context";
import { stubAuthenticationContext } from "./context.fixture";
import { AuthenticationSession } from "./session";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@a-novel-kit/nodelib-browser/http";

import type { RequestEvent } from "@sveltejs/kit";

vi.mock("./context", () => ({ createAuthenticationContext: vi.fn() }));

function event(
  fields = { email: "creator@example.com", password: "test-password" },
  url = new URL("https://template.test/?auth=login")
): RequestEvent {
  const request = {
    url,
    cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
    request: new Request(url, { method: "POST", body: new URLSearchParams(fields) }),
  } as unknown as RequestEvent;
  vi.mocked(createAuthenticationContext).mockReturnValue(stubAuthenticationContext(request.cookies, url));
  return request;
}

const rejections = [
  [new HttpError(401, "fixture-only detail"), 401, "invalidCredentials"],
  [new HttpError(429, "fixture-only detail"), 429, "tooManyAttempts"],
  [new Error("fixture-only detail"), 503, "serviceUnavailable"],
] as const;

const returnDestinations = [
  ["/account?panel=email#email", "/account?panel=email#email"],
  ["https://attacker.invalid", "/"],
  ["/?auth=login&returnTo=%2Faccount", "/"],
];

describe("login outcomes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid fields before contacting the service", async () => {
    const result = await authenticationActions.default(event({ email: "invalid-private-value", password: "" }));
    expect(result).toMatchObject({
      status: 400,
      data: { authentication: { journey: "login", state: { status: "validation-error" } } },
    });
    expect(createAuthenticationContext).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("invalid-private-value");
  });

  it.each(rejections)("maps a %s rejection without exposing service detail", async (error, status, feedback) => {
    vi.spyOn(AuthenticationSession.prototype, "login").mockRejectedValue(error);
    const result = await authenticationActions.default(event());
    expect(result).toMatchObject({
      status,
      data: { authentication: { journey: "login", state: { status: "service-error", feedback } } },
    });
    expect(JSON.stringify(result)).not.toContain("fixture-only detail");
  });

  it.each(returnDestinations)("redirects to a sanitized %s only after login", async (returnTo, expected) => {
    const login = vi.spyOn(AuthenticationSession.prototype, "login").mockResolvedValue(undefined);
    const url = new URL("https://template.test/?auth=login");
    url.searchParams.set("returnTo", returnTo);
    await expect(authenticationActions.default(event(undefined, url))).rejects.toMatchObject({
      status: 303,
      location: expected,
    });
    expect(login).toHaveBeenCalledWith("creator@example.com", "test-password");
  });
});
