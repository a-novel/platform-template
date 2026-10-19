import { accountActions, loadAccount } from "#lib/server/auth/account-route.js";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = loadAccount;
export const actions: Actions = accountActions;
