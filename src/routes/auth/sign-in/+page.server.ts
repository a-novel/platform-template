import { startSignIn } from "../sign-in.server";
import type { PageServerLoad } from "./$types";

// A page, so a refusal such as a planned downtime renders the error page.
export const load: PageServerLoad = startSignIn;
