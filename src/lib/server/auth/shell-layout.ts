import { accountDisplayFromHandle } from "#lib/application/shell/account-display.js";
import type { ShellSession, ShellViewModel } from "#lib/application/shell/types.js";

import { readPlatformDowntime } from "../downtime";
import { getRuntimeConfig } from "../runtime-config.server";
import { type AuthenticationEvent, getAuthenticationContext } from "./context";
import type { ResolvedSession } from "./session";

import { isDowntimeStarted } from "@a-novel-kit/nodelib-server";
import type { AuthorizationStatus } from "@a-novel-kit/uikit/authorization";

/** The page authorization each shell session grants. */
const shellAuthorization = {
  anonymous: "anonymous",
  loading: "anonymous",
  error: "unavailable",
  downtime: "unavailable",
  authenticated: "allowed",
} as const satisfies Record<ShellSession["status"], AuthorizationStatus>;

/** The rail destination each page belongs to. */
const navigation: Record<string, ShellViewModel["activeNavigation"]> = { "/": "home", "/privacy": "privacy" };

/** Loads the shell's navigation state, account platform links, session and page authorization. */
export const loadShell = async (event: AuthenticationEvent) => {
  const session = await readShellSession(event);

  return {
    activeNavigation: navigation[event.url.pathname] ?? null,
    ...readAccountLinks(),
    session,
    authorization: shellAuthorization[session.status],
  };
};

/**
 * Links the account page and the invitation request, which the account platform serves, or nothing
 * while the runtime configuration is invalid.
 */
function readAccountLinks(): { accountHref: string | null; invitationHref: string | null } {
  try {
    const { accountUrl } = getRuntimeConfig();
    return {
      accountHref: new URL("/account", accountUrl).href,
      invitationHref: new URL("/?auth=register", accountUrl).href,
    };
  } catch {
    return { accountHref: null, invitationHref: null };
  }
}

/** Resolves the session the shell shows, exposing only a display name to the browser. */
async function readShellSession(event: AuthenticationEvent): Promise<ShellSession> {
  // A started downtime stops Authentication, so the shell doesn't ask it for the session.
  if (isDowntimeStarted(await readPlatformDowntime())) return { status: "downtime" };

  const resolved = await currentSession(event);
  if (resolved.status === "downtime") return { status: "downtime" };
  if (resolved.status === "unavailable") return { status: "error" };
  if (resolved.status === "none" || !resolved.claims.userID) return { status: "anonymous" };
  if (resolved.identityHandle) return { status: "authenticated", ...accountDisplayFromHandle(resolved.identityHandle) };
  return { status: "authenticated" };
}

/** Reads the visitor's session, treating a server that cannot reach Authentication as an outage. */
async function currentSession(event: AuthenticationEvent): Promise<ResolvedSession> {
  try {
    return await getAuthenticationContext(event).session.current();
  } catch {
    return { status: "unavailable" };
  }
}
