import { authenticationActions } from "#lib/server/auth/authentication-route.js";

import type { Actions } from "./$types";

export const actions: Actions = authenticationActions;
