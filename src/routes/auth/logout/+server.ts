import { getAuthenticationContext } from "#lib/server/auth/context.js";

import type { RequestHandler } from "./$types";

import { redirect } from "@sveltejs/kit";

/** Signs the visitor out, revoking the session's refresh token, and returns the browser to the app shell. */
export const POST: RequestHandler = async (event) => {
  await getAuthenticationContext(event).session.logout();
  redirect(303, "/");
};
