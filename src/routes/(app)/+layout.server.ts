import { loadShell } from "#lib/server/auth/shell-layout.js";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = loadShell;
