import { type Locale, defaultLocale, supportedLocales } from "./config";
import { createI18n } from "./instance";

/** Reads the locale the Storybook toolbar selects, or the default one. */
export function storybookLocale(globals: Record<string, unknown>): Locale {
  return supportedLocales.find((candidate) => candidate === globals.locale) ?? defaultLocale;
}

/** Resolves Storybook interaction labels from the same bundled catalogs as the rendered story. */
export function createStorybookTranslator(globals: Record<string, unknown>) {
  return createI18n(storybookLocale(globals)).t;
}
