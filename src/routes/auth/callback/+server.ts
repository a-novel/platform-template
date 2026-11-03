import { completeSignIn } from "../sign-in.server";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = completeSignIn;
