import { type AuthenticationEvent, getAuthenticationContext } from "./context";

import { redirect } from "@sveltejs/kit";

/** Signs the visitor out, revoking the session's refresh token, and returns the browser to the app shell. */
export async function logoutAuthentication(event: AuthenticationEvent): Promise<never> {
  await getAuthenticationContext(event).session.logout();
  redirect(303, "/");
}
