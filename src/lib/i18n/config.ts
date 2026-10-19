import { resolveAcceptLanguage } from "@a-novel-kit/nodelib-i18n";

export const supportedLocales = ["en", "fr"] as const;
export const namespaces = ["common"] as const;
export const defaultLocale = "en";
export const defaultNamespace = "common";

export type Locale = (typeof supportedLocales)[number];
export type Namespace = (typeof namespaces)[number];

export function resolveLocale(acceptLanguage: string | null): Locale {
  return resolveAcceptLanguage(acceptLanguage, supportedLocales, defaultLocale);
}
