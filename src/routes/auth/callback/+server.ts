import { completeSignIn } from "#lib/server/auth/sign-in.js";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = completeSignIn;
