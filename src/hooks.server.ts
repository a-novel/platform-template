import { resolveLocale, supportedLocales } from "#lib/i18n/config.js";

import { LANGUAGE_COOKIE, parseLanguage } from "@a-novel-kit/nodelib-browser/preferences";
import { traceResponse } from "@a-novel-kit/nodelib-server/telemetry";

import type { Handle } from "@sveltejs/kit/hooks";

/**
 * Gives each request its locale, the language the visitor chose or else their browser's, refuses framing,
 * keeps personal responses out of caches, and traces the response.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const chosen = parseLanguage(event.cookies.get(LANGUAGE_COOKIE), supportedLocales);
  const locale = resolveLocale(chosen, event.request.headers.get("accept-language"));

  event.locals.locale = locale;

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", locale),
  });

  // Only the logout form acts on a click, yet no site may overlay any page (RFC 9700 §4.16). Pages already
  // carry `frame-ancestors 'none'` in the CSP that nodelib's SvelteKit preset sends; this header also covers
  // the responses without one.
  response.headers.set("x-frame-options", "DENY");
  // A response that sets cookies, or states no cache policy of its own, is the visitor's alone, so no cache
  // may keep it (RFC 9111 §5.2.2.5). Any other keeps its route's policy, as an image whose address names its
  // version keeps it for a year.
  if (response.headers.has("set-cookie") || !response.headers.has("cache-control")) {
    response.headers.set("cache-control", "private, no-store");
  }

  traceResponse(event, response);
  return response;
};
