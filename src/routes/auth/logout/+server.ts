import { logoutAuthentication } from "#lib/server/auth/logout.js";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = logoutAuthentication;
