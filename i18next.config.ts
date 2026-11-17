import { defaultLocale, defaultNamespace, supportedLocales } from "./src/lib/i18n/config";

import { I18next } from "@a-novel-kit/nodelib-config/i18next";

export default I18next({
  defaultNamespace,
  locales: supportedLocales,
  primaryLanguage: defaultLocale,
});
