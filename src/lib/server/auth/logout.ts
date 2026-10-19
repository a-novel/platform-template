import { createAuthenticationContext } from "./context";

import type { RequestEvent } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";

/** Clears the platform session and returns the browser to the app shell. */
export function logoutAuthentication(event: Pick<RequestEvent, "cookies" | "getClientAddress" | "url">): never {
  createAuthenticationContext(event).session.clear();
  redirect(303, "/");
}
