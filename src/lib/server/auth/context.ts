import { getRuntimeConfig } from "../runtime-config.server";
import { serviceFetch } from "../service-fetch";
import { createAccessTokenVerifier } from "./access-token";
import { AuthenticationSession, createSessionClient } from "./session";

import type { JwtPayload } from "@a-novel-kit/nodelib-server";
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

// One verifier per process caches JSON keys' public keys for every request.
let verifyAccessToken: ((accessToken: string) => Promise<JwtPayload>) | undefined;

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
      serviceTokenPath: config.serviceTokenPath,
      visitorAddress: event.getClientAddress(),
    })
  );
  verifyAccessToken ??= createAccessTokenVerifier(config.jsonKeysServiceUrl);
  const context = {
    api,
    session: new AuthenticationSession(createSessionClient(api, verifyAccessToken), event.cookies),
  };

  requestContexts.set(event.cookies, context);
  return context;
}
