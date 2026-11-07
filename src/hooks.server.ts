import { resolveLocale, supportedLocales } from "#lib/i18n/config.js";
import { createI18n } from "#lib/i18n/instance.js";
import { hasSession } from "#lib/server/auth/session.js";

import { LANGUAGE_COOKIE, parseLanguage } from "@a-novel-kit/nodelib-browser/preferences";

import { SpanStatusCode } from "@opentelemetry/api";
import type { RequestEvent } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";

/**
 * Gives each request its own locale and translations, in the language the visitor chose or else their
 * browser's, refuses framing, keeps signed-in pages out of
 * caches, and traces the response.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const chosen = parseLanguage(event.cookies.get(LANGUAGE_COOKIE), supportedLocales);
  const locale = resolveLocale(chosen, event.request.headers.get("accept-language"));

  event.locals.i18n = createI18n(locale);
  event.locals.locale = locale;

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", locale),
  });

  // Only the logout form acts on a click, yet no site may overlay any page (RFC 9700 §4.16). Pages already
  // carry `frame-ancestors 'none'` in the CSP that nodelib's SvelteKit preset sends; this header also covers
  // the responses without one.
  response.headers.set("x-frame-options", "DENY");
  // A response rendered with a session is the visitor's alone, so no cache may keep it (RFC 9111 §5.2.2.5).
  if (hasSession(event.cookies)) response.headers.set("cache-control", "private, no-store");

  traceResponse(event, response);
  return response;
};

// Names the request's span after its route, as `GET /(app)/account`, and records the response's
// status, so span metrics split the traffic by page and tell a refusal from a fault. A request that
// matched no route keeps its method alone, so no path names a span.
function traceResponse({ request, route, tracing }: RequestEvent, { status }: Response): void {
  tracing.root.updateName(route.id ? `${request.method} ${route.id}` : request.method);
  tracing.root.setAttribute("http.response.status_code", status);

  if (status >= 500) tracing.root.setStatus({ code: SpanStatusCode.ERROR });
}
