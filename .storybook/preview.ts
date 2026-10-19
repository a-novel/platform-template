import I18nProvider from "../src/lib/i18n/I18nProvider.svelte";
import { type Locale, defaultLocale, supportedLocales } from "../src/lib/i18n/config";
import { storybookLocale } from "../src/lib/i18n/storybook";

import type { Preview } from "@storybook/sveltekit";

/** Each locale's name, in its own language, for the toolbar. */
const localeNames: Record<Locale, string> = { en: "English", fr: "Français" };

const preview: Preview = {
  initialGlobals: {
    locale: defaultLocale,
  },
  globalTypes: {
    locale: {
      description: "Language",
      toolbar: {
        icon: "globe",
        items: supportedLocales.map((locale) => ({ value: locale, title: localeNames[locale] })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (_, context) => ({
      Component: I18nProvider,
      props: { locale: storybookLocale(context.globals) },
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
