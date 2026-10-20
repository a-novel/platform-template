import { getRuntimeConfig } from "../runtime-config.server";
import { serviceFetch } from "../service-fetch";
import { AuthenticationSession, createSessionClient } from "./session";

import { AuthenticationApi } from "@a-novel/service-authentication-rest";

import type { RequestEvent } from "@sveltejs/kit";

/** AuthenticationContext is the authentication client and session of one request. */
export interface AuthenticationContext {
  api: AuthenticationApi;
  session: AuthenticationSession;
}

/** AuthenticationEvent is the part of a request the authentication context reads. */
export type AuthenticationEvent = Pick<RequestEvent, "cookies" | "getClientAddress" | "url">;

/** Creates the authentication client and session for one visitor's request. */
export function createAuthenticationContext(event: AuthenticationEvent): AuthenticationContext {
  const config = getRuntimeConfig();
  const api = new AuthenticationApi(
    config.authenticationServiceUrl,
    serviceFetch({ audience: config.authenticationServiceAudience, visitorAddress: event.getClientAddress() })
  );

  return {
    api,
    session: new AuthenticationSession(createSessionClient(api), event.cookies, event.url),
  };
}
