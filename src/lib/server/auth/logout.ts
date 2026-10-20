import { type AuthenticationEvent, createAuthenticationContext } from "./context";

import { redirect } from "@sveltejs/kit";

/** Clears the platform session and returns the browser to the app shell. */
export function logoutAuthentication(event: AuthenticationEvent): never {
  createAuthenticationContext(event).session.clear();
  redirect(303, "/");
}
