import { resolveLocale } from "#lib/i18n/config.js";
import { createI18n } from "#lib/i18n/instance.js";

import type { Handle } from "@sveltejs/kit/hooks";

export const handle: Handle = async ({ event, resolve }) => {
  const locale = resolveLocale(event.request.headers.get("accept-language"));

  event.locals.i18n = createI18n(locale);
  event.locals.locale = locale;

  return await resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", locale),
  });
};
