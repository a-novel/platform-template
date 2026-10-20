import { requireAuthorization } from "./authorization";
import { createAuthenticationContext } from "./context";
import { stubAuthenticationContext } from "./context.fixture";
import { AuthenticationSession } from "./session";
import type { AuthenticatedSession } from "./session";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@a-novel/service-authentication-rest";

import type { RequestEvent } from "@sveltejs/kit";

vi.mock("./context", () => ({ createAuthenticationContext: vi.fn() }));

const authenticated = vi.spyOn(AuthenticationSession.prototype, "authenticated");
const cookies = { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as unknown as RequestEvent["cookies"];
const event = {
  cookies,
  getClientAddress: () => "192.0.2.1",
  url: new URL("https://template.test/account?panel=email"),
};
const session = {
  status: "available",
  accessToken: "test-access",
  claims: { userID: "test-user", roles: ["auth:user"] },
} as AuthenticatedSession;

describe("protected operations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAuthenticationContext).mockReturnValue(stubAuthenticationContext(cookies, event.url));
  });

  it("returns server credentials only after a verified account satisfies the rule", async () => {
    authenticated.mockResolvedValue(session);
    await expect(
      requireAuthorization(event, (value) => value.claims.roles?.includes(Role.User) ?? false)
    ).resolves.toMatchObject({ session });
    await requireAuthorization(event);
    expect(authenticated).toHaveBeenCalledTimes(2);
  });

  it("redirects anonymous requests to the modal with their page and query", async () => {
    authenticated.mockResolvedValue(null);
    await expect(requireAuthorization(event)).rejects.toMatchObject({
      status: 303,
      location: "/?auth=login&returnTo=%2Faccount%3Fpanel%3Demail",
    });
  });

  it("returns a genuine 403 when a verified account lacks permission", async () => {
    authenticated.mockResolvedValue(session);
    await expect(requireAuthorization(event, () => false)).rejects.toMatchObject({ status: 403 });
  });

  it("returns 503 without clearing cookies or evaluating permissions during an outage", async () => {
    authenticated.mockRejectedValue(new Error("network unavailable"));
    const rule = vi.fn(() => true);
    await expect(requireAuthorization(event, rule)).rejects.toMatchObject({ status: 503 });
    expect(rule).not.toHaveBeenCalled();
    expect(cookies.delete).not.toHaveBeenCalled();
  });

  it("handles an unavailable authentication configuration as an outage", async () => {
    vi.mocked(createAuthenticationContext).mockImplementation(() => {
      throw new Error("configuration unavailable");
    });
    await expect(requireAuthorization(event)).rejects.toMatchObject({ status: 503 });
    expect(cookies.delete).not.toHaveBeenCalled();
  });
});
