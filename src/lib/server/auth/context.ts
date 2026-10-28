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

// SvelteKit hands the hooks, actions and loads of one request the same cookies object.
const requestContexts = new WeakMap<AuthenticationEvent["cookies"], AuthenticationContext>();

/**
 * Returns the authentication client and session of one visitor's request. Every load and action of
 * the request shares them, so the request checks the session once.
 */
export function getAuthenticationContext(event: AuthenticationEvent): AuthenticationContext {
  const shared = requestContexts.get(event.cookies);
  if (shared) return shared;

  const config = getRuntimeConfig();
  const api = new AuthenticationApi(
    config.authenticationServiceUrl,
    serviceFetch({
      audience: config.authenticationServiceAudience,
      serviceTokenPath: config.serviceTokenPath,
      visitorAddress: event.getClientAddress(),
    })
  );
  const context = { api, session: new AuthenticationSession(createSessionClient(api), event.cookies, event.url) };

  requestContexts.set(event.cookies, context);
  return context;
}
