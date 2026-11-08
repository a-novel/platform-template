import { type AuthenticationEvent, getAuthenticationContext } from "#lib/server/auth/context.js";
import type { ResolvedSession } from "#lib/server/auth/session.js";
import { readPlatformDowntime } from "#lib/server/downtime.js";
import { type ProfileSummary, getProfileContext, summarizeProfile } from "#lib/server/profile/context.js";
import { getRuntimeConfig } from "#lib/server/runtime-config.server.js";

import type { LayoutServerLoad } from "./$types";
import { accountDisplayFromHandle } from "./account-display";
import type { ShellSession, ShellViewModel } from "./controller.svelte";

import { NAVIGATION_RAIL_COOKIE, parseNavigationRail } from "@a-novel-kit/nodelib-browser/preferences";
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
export const load: LayoutServerLoad = async (event) => {
  const session = await readShellSession(event);

  return {
    activeNavigation: navigation[event.url.pathname] ?? null,
    // The browser sends the rail the visitor left on any Agora app, so the page renders it from the start.
    rail: parseNavigationRail(event.cookies.get(NAVIGATION_RAIL_COOKIE)),
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
      invitationHref: new URL("/account?auth=register", accountUrl).href,
    };
  } catch {
    return { accountHref: null, invitationHref: null };
  }
}

/** Resolves the session the shell shows, exposing only a display identity to the browser. */
async function readShellSession(event: AuthenticationEvent): Promise<ShellSession> {
  // A started downtime stops Authentication, so the shell doesn't ask it for the session.
  if (isDowntimeStarted(await readPlatformDowntime())) return { status: "downtime" };

  const resolved = await currentSession(event);
  if (resolved.status === "downtime") return { status: "downtime" };
  if (resolved.status === "unavailable") return { status: "error" };
  if (resolved.status === "none" || !resolved.claims.userID) return { status: "anonymous" };

  const { username, picture } = await readProfile(event, resolved.accessToken);
  // Without the email handle, only a username names the account.
  const display = resolved.identityHandle
    ? accountDisplayFromHandle(resolved.identityHandle, username)
    : { displayName: username };
  return { status: "authenticated", ...display, picture };
}

/**
 * Reads the visitor's username and the address of their picture on the account platform. Without the
 * profile service, the shell names the account by its email handle and shows initials.
 */
async function readProfile(event: AuthenticationEvent, accessToken: string): Promise<ProfileSummary> {
  try {
    const profile = await getProfileContext(event).self(accessToken);
    return summarizeProfile(profile, getRuntimeConfig().accountUrl);
  } catch {
    return {};
  }
}

/** Reads the visitor's session, treating a server that cannot reach Authentication as an outage. */
async function currentSession(event: AuthenticationEvent): Promise<ResolvedSession> {
  try {
    return await getAuthenticationContext(event).session.current();
  } catch {
    return { status: "unavailable" };
  }
}
