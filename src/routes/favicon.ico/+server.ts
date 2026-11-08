import type { RequestHandler } from "./$types";

import favicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon.png?no-inline";

import { redirect } from "@sveltejs/kit";

/** Points the tools that look for the site's icon at /favicon.ico, such as a password manager's icon
 * service, at the app's icon. The icon's name changes with each build, so the move is temporary. */
export const GET: RequestHandler = () => redirect(307, favicon);
