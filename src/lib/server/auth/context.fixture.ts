import type { AuthenticationContext } from "./context";
import { AuthenticationSession, type SessionCookies } from "./session";

import { vi } from "vitest";

import { AuthenticationApi } from "@a-novel/service-authentication-rest";

/** Builds a request's authentication context with a session whose service calls are bare spies. */
export function stubAuthenticationContext(cookies: SessionCookies, url: URL): AuthenticationContext {
  return {
    api: new AuthenticationApi("https://auth.example.test"),
    session: new AuthenticationSession(
      { claims: vi.fn(), login: vi.fn(), refresh: vi.fn(), revoke: vi.fn(), createAnonymous: vi.fn() },
      cookies,
      url
    ),
  };
}
