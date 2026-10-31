import type { AccountClaimsState, AccountCredentialsState, AccountScreenModel } from "#lib/application/auth/types.js";

import { requireAuthorization } from "./authorization";
import type { AuthenticationEvent } from "./context";
import { logoutAuthentication } from "./logout";
import { readTokenExpiry } from "./session";

import { type AuthenticationApi, credentialsGetSelf } from "@a-novel/service-authentication-rest";

import type { RequestEvent } from "@sveltejs/kit";
import { isHttpError, isRedirect } from "@sveltejs/kit";

function formatExpiry(token: string | undefined, dates: Intl.DateTimeFormat, fallback: string): string {
  const expiry = token ? readTokenExpiry(token) : null;
  return expiry ? dates.format(expiry) : fallback;
}

/** Reads the account's email and its pending change. A failure hides only them: logout still works. */
async function loadCredentials(
  api: AuthenticationApi,
  accessToken: string,
  dates: Intl.DateTimeFormat
): Promise<AccountCredentialsState> {
  try {
    const { email, pendingEmail } = await credentialsGetSelf(api, accessToken);
    return {
      status: "ready",
      email,
      pendingEmail: pendingEmail && { email: pendingEmail.email, expiresAt: dates.format(pendingEmail.expiresAt) },
    };
  } catch {
    // The trace records the failed call.
    return { status: "unavailable" };
  }
}

function accountModel(claims: AccountClaimsState, credentials: AccountCredentialsState): AccountScreenModel {
  return { claims, credentials, logoutState: "ready" };
}

/** Loads the account recap and email. An authentication outage still renders the logout form. */
export const loadAccount = async (event: AuthenticationEvent & Pick<RequestEvent, "locals">) => {
  const { locals } = event;
  const t = locals.i18n.getFixedT(locals.locale, "common");
  const dates = new Intl.DateTimeFormat(locals.locale, { dateStyle: "medium", timeStyle: "short" });

  try {
    const { authentication, session } = await requireAuthorization(event);
    const credentials = await loadCredentials(authentication.api, session.accessToken, dates);
    // The shell names the visitor from a cookie, which an email change on another device leaves stale.
    if (credentials.status === "ready") authentication.session.rememberIdentity(credentials.email);

    return {
      authorization: "allowed" as const,
      accountModel: accountModel(
        {
          status: "ready",
          userId: session.claims.userID,
          roles: session.claims.roles ?? [],
          accessExpiresAt: formatExpiry(session.accessToken, dates, t("authFlow.expiryUnavailable")),
          refreshExpiresAt: formatExpiry(session.refreshToken, dates, t("authFlow.expiryUnavailable")),
        },
        credentials
      ),
    };
  } catch (error) {
    // Redirects, refusals and planned downtimes render their own pages. Any other failure keeps the logout form.
    if (isRedirect(error) || isHttpError(error, 403) || (isHttpError(error, 503) && error.body.downtime)) throw error;

    return {
      authorization: "unavailable" as const,
      accountModel: accountModel({ status: "error", feedback: "sessionUnavailable" }, { status: "unavailable" }),
    };
  }
};

/** The account page's form actions. Logout clears the session cookies without calling the service. */
export const accountActions = {
  logout: logoutAuthentication,
};
