import { loginHref } from "#lib/application/auth/navigation.js";

import { downtimeError, refuseDuringDowntime } from "../downtime";
import { type AuthenticationEvent, createAuthenticationContext } from "./context";
import { type AuthenticatedSession, AuthenticationDowntimeError } from "./session";

import { error, redirect } from "@sveltejs/kit";

/**
 * Verifies each protected load or mutation independently. SDK clients and tokens remain server-only.
 * Optional rules restrict a verified account; authentication outages never become anonymous access.
 */
export async function requireAuthorization(
  event: AuthenticationEvent,
  when: (session: AuthenticatedSession) => boolean = () => true
) {
  await refuseDuringDowntime();

  const { authentication, session } = await authenticate(event);
  if (!session) redirect(303, loginHref(event.url.pathname + event.url.search));
  if (!when(session)) error(403, "Access denied");
  return { authentication, session };
}

/** Resolves the visitor's session, or fails with the 503 an unreachable authentication service warrants. */
async function authenticate(event: AuthenticationEvent) {
  try {
    const authentication = createAuthenticationContext(event);
    return { authentication, session: await authentication.session.authenticated() };
  } catch (cause) {
    if (cause instanceof AuthenticationDowntimeError) downtimeError();
    error(503, "Authentication unavailable");
  }
}
