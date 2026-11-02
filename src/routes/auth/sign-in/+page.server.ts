import { startSignIn } from "#lib/server/auth/sign-in.js";

import type { PageServerLoad } from "./$types";

// A page, so a refusal such as a planned downtime renders the error page.
export const load: PageServerLoad = startSignIn;
