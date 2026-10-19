import { type Locale, defaultLocale, defaultNamespace, namespaces } from "./config";
import { resources } from "./resources";

import { createStaticI18n } from "@a-novel-kit/nodelib-i18n";

import type { i18n } from "i18next";

/** Creates one locale-isolated i18n instance from bundled YAML catalogs. */
export function createI18n(locale: Locale): i18n {
  return createStaticI18n({
    defaultLocale,
    defaultNamespace,
    locale,
    namespaces,
    resources,
  });
}
