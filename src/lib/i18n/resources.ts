import type { Locale, Namespace } from "./config";
import english from "./locales/en/common.yaml";
import french from "./locales/fr/common.yaml";

import type { TranslationResource } from "@a-novel-kit/nodelib-i18n";

/** The bundled catalogs of every locale and namespace. */
export const resources = {
  en: {
    common: english,
  },
  fr: {
    common: french,
  },
} satisfies Record<Locale, Record<Namespace, TranslationResource>>;
