import { type AuthenticationEvent, getAuthenticationContext } from "./context";

import { redirect } from "@sveltejs/kit";

/** Clears the platform session and returns the browser to the app shell. */
export function logoutAuthentication(event: AuthenticationEvent): never {
  getAuthenticationContext(event).session.clear();
  redirect(303, "/");
}
