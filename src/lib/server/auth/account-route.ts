import type { AccountClaimsState, AccountScreenModel } from "#lib/application/auth/types.js";

import { requireAuthorization } from "./authorization";
import type { AuthenticationEvent } from "./context";
import { logoutAuthentication } from "./logout";
import { readTokenExpiry } from "./session";

import type { RequestEvent } from "@sveltejs/kit";
import { isHttpError, isRedirect } from "@sveltejs/kit";

function formatExpiry(token: string | undefined, locale: string, fallback: string): string {
  const expiry = token ? readTokenExpiry(token) : null;
  if (!expiry) return fallback;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(expiry);
}

function accountModel(claims: AccountClaimsState): AccountScreenModel {
  return { claims, logoutState: "ready" };
}

/** Loads the account recap. An authentication outage still renders the logout form. */
export const loadAccount = async (event: AuthenticationEvent & Pick<RequestEvent, "locals">) => {
  const { locals } = event;
  const t = locals.i18n.getFixedT(locals.locale, "common");

  try {
    const { session } = await requireAuthorization(event);

    return {
      authorization: "allowed" as const,
      accountModel: accountModel({
        status: "ready",
        userId: session.claims.userID,
        roles: session.claims.roles ?? [],
        accessExpiresAt: formatExpiry(session.accessToken, locals.locale, t("authFlow.expiryUnavailable")),
        refreshExpiresAt: formatExpiry(session.refreshToken, locals.locale, t("authFlow.expiryUnavailable")),
      }),
    };
  } catch (error) {
    // A planned downtime renders as the maintenance page.
    if (isRedirect(error) || isHttpError(error, 403) || (isHttpError(error, 503) && error.body.downtime)) throw error;

    return {
      authorization: "unavailable" as const,
      accountModel: accountModel({ status: "error", feedback: "sessionUnavailable" }),
    };
  }
};

export const accountActions = {
  logout: logoutAuthentication,
};
