import { resolveLocale } from "#lib/i18n/config.js";
import { createI18n } from "#lib/i18n/instance.js";

import { SpanStatusCode } from "@opentelemetry/api";
import type { RequestEvent } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";

/** Gives each request its own locale and translations, hands its trace to the page, and traces its response. */
export const handle: Handle = async ({ event, resolve }) => {
  const locale = resolveLocale(event.request.headers.get("accept-language"));

  event.locals.i18n = createI18n(locale);
  event.locals.locale = locale;

  const trace = pageTrace(event);
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", locale).replace("%trace%", trace),
  });

  traceResponse(event, response);
  return response;
};

// The browser's page load continues the request's trace from this tag, as `traceId-spanId-sampled`.
function pageTrace({ tracing }: RequestEvent): string {
  if (!tracing.enabled) return "";

  const { traceId, spanId, traceFlags } = tracing.root.spanContext();
  return `${traceId}-${spanId}-${traceFlags & 1}`;
}

// Names the request's span after its route, as `GET /(app)/account`, and records the response's
// status, so span metrics split the traffic by page and tell a refusal from a fault. A request that
// matched no route keeps its method alone, so no path names a span.
function traceResponse({ request, route, tracing }: RequestEvent, { status }: Response): void {
  tracing.root.updateName(route.id ? `${request.method} ${route.id}` : request.method);
  tracing.root.setAttribute("http.response.status_code", status);

  if (status >= 500) tracing.root.setStatus({ code: SpanStatusCode.ERROR });
}
