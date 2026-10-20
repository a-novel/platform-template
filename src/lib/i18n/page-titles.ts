import type { AuthenticationPanelModel } from "#lib/application/auth/types.js";

import type { TFunction } from "i18next";

/** Labels the login task without exposing the submitted email address. */
export function authenticationPageTitle(t: TFunction<"common">, { state }: AuthenticationPanelModel) {
  const title = t("shell.auth.login.title");
  if (state.status === "service-error")
    return t("pageTitles.withState", { title, status: t("authUi.serviceUnavailable") });
  return title;
}

/** Names an error page's tab with a readable description of its status. */
export function errorPageTitle(t: TFunction<"common">, status: number, downtime = false) {
  if (downtime) return t("access.downtime.title");

  switch (status) {
    case 404:
      return t("access.notFound.title");
    case 403:
      return t("access.forbidden.title");
    case 503:
      return t("access.unavailable.title");
    default:
      return t("access.error.title");
  }
}
