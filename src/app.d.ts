import type { Locale } from "#lib/i18n/config.js";

import type { AuthorizationStatus } from "@a-novel-kit/uikit/authorization";

import type { i18n } from "i18next";

declare global {
  namespace App {
    interface Error {
      message: string;
      /** Set when the request failed because a planned downtime stopped the services it needs. */
      downtime?: boolean;
    }
    interface PageData {
      authorization?: AuthorizationStatus;
    }
    interface Locals {
      i18n: i18n;
      locale: Locale;
    }
  }
}

export {};
