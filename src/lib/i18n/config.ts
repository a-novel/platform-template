import { resolveAcceptLanguage } from "@a-novel-kit/nodelib-i18n";

export const supportedLocales = ["en", "fr"] as const;
export const namespaces = ["common"] as const;
export const defaultLocale = "en";
export const defaultNamespace = "common";

export type Locale = (typeof supportedLocales)[number];
export type Namespace = (typeof namespaces)[number];

/** Each locale's name in its own language, which reads the same in every language. */
export const localeNames: Record<Locale, string> = { en: "English", fr: "Français" };

/**
 * Picks the language the visitor chose on any Agora app, else the supported locale an `Accept-Language`
 * header prefers, else the default one.
 */
export function resolveLocale(chosen: Locale | undefined, acceptLanguage: string | null): Locale {
  return chosen ?? resolveAcceptLanguage(acceptLanguage, supportedLocales, defaultLocale);
}
