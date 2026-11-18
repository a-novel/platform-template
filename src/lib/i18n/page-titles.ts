import type { Messages } from "@a-novel-kit/uikit";

import type { TFunction } from "i18next";

/**
 * Uses a readable error description instead of a bare HTTP status in the tab. uikit ships the access and page
 * states' copy, so `uikitText` reads it.
 */
export function errorPageTitle(t: TFunction<"common">, uikitText: Messages["t"], status: number, downtime = false) {
  if (downtime) return t("access.downtime.title");

  switch (status) {
    case 404:
      return uikitText("access.notFound.title");
    case 403:
      return uikitText("access.forbidden.title");
    case 503:
      return uikitText("access.unavailable.title");
    default:
      return uikitText("access.error.title");
  }
}
