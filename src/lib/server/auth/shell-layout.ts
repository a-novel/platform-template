import { accountDisplayFromHandle } from "#lib/application/shell/account-display.js";
import type { ShellSession } from "#lib/application/shell/types.js";
import { createAuthenticationContext } from "#lib/server/auth/context.js";
import { readPlatformDowntime } from "#lib/server/downtime.js";

import { isDowntimeStarted } from "@a-novel-kit/nodelib-server";

import type { RequestEvent } from "@sveltejs/kit";

export const loadShell = async (event: Pick<RequestEvent, "cookies" | "getClientAddress" | "locals" | "url">) => {
  const { locals, url } = event;
  const activeNavigation = url.pathname === "/" ? ("home" as const) : null;
  const t = locals.i18n.getFixedT(locals.locale, "common");
  let session: ShellSession = { status: "anonymous" };

  // A started downtime stops Authentication, so the shell doesn't ask it for the session.
  const resolved = isDowntimeStarted(await readPlatformDowntime())
    ? ({ status: "downtime" } as const)
    : await Promise.resolve()
        .then(() => createAuthenticationContext(event).session.current())
        .catch(() => ({ status: "unavailable" as const }));

  if (resolved.status === "downtime") {
    session = { status: "downtime" };
  } else if (resolved.status === "unavailable") {
    session = { status: "error" };
  } else if (resolved.status === "available" && resolved.claims.userID) {
    const account = resolved.identityHandle
      ? accountDisplayFromHandle(resolved.identityHandle)
      : { displayName: t("shell.accountFallback"), initials: "A" };
    session = { status: "authenticated", ...account };
  }

  return {
    activeNavigation,
    session,
    authorization:
      session.status === "authenticated"
        ? ("allowed" as const)
        : session.status === "error" || session.status === "downtime"
          ? ("unavailable" as const)
          : ("anonymous" as const),
  };
};
