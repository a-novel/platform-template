import type { PageServerLoad } from "./$types";

import { redirect } from "@sveltejs/kit";

/**
 * Sends a logged-in visitor to their account's privacy tab, where they change the answer every Agora
 * app shares. The page stays public for everyone else, and for a server that cannot read where the
 * account platform lives.
 */
export const load: PageServerLoad = async ({ parent }) => {
  const { session, accountHref } = await parent();
  if (session.status === "authenticated" && accountHref) redirect(307, `${accountHref}/privacy`, { external: true });
};
