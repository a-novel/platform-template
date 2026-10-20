import I18nProvider from "./I18nProvider.svelte";
import type { Locale } from "./config";

/** Renders a component test inside the platform translations of one locale. */
export function withLocale(locale: Locale = "en") {
  return { wrapper: I18nProvider, wrapperProps: { locale } };
}
