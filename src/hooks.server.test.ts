import { handle } from "./hooks.server";

import { describe, expect, it, vi } from "vitest";

import { SpanStatusCode, TraceFlags, trace } from "@opentelemetry/api";
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-node";
import type { RequestEvent } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const SPAN_ID = "00f067aa0ba902b7";

function event(path: string, language?: string, traced = false): RequestEvent {
  const url = new URL(path, "https://template.test");
  const root = trace.wrapSpanContext({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.SAMPLED });
  return {
    url,
    locals: {},
    request: new Request(url, { headers: language ? { "accept-language": language } : undefined }),
    route: { id: url.pathname },
    tracing: { enabled: traced, root, current: root },
  } as unknown as RequestEvent;
}

/** Renders the page shell through the hook and returns its HTML. */
async function render(request: RequestEvent, html: string): Promise<string> {
  const resolve = vi.fn<Parameters<Handle>[0]["resolve"]>(async (_, options) => {
    return new Response(await options?.transformPageChunk?.({ html, done: true }));
  });
  return (await handle({ event: request, resolve })).text();
}

describe("request hook", () => {
  it("keeps translations and document language isolated across concurrent requests", async () => {
    const french = event("/", "fr-CA,fr;q=0.9,en;q=0.8");
    const english = event("/", "de");
    const resolve = vi.fn<Parameters<Handle>[0]["resolve"]>(async (request, options) => {
      await Promise.resolve();
      const html = await options?.transformPageChunk?.({ html: '<html lang="%lang%">', done: true });
      return new Response(html + request.locals.i18n.t("shell.accountFallback"));
    });
    const [fr, en] = await Promise.all([handle({ event: french, resolve }), handle({ event: english, resolve })]);
    await expect(fr.text()).resolves.toBe('<html lang="fr">Compte');
    await expect(en.text()).resolves.toBe('<html lang="en">Account');
    expect(french.locals.locale).toBe("fr");
    expect(english.locals.locale).toBe("en");
    expect(french.locals.i18n).not.toBe(english.locals.i18n);
  });

  it.each([
    { name: "hands the request's trace to the page", traced: true, want: `${TRACE_ID}-${SPAN_ID}-1` },
    { name: "leaves the page's trace empty while tracing is off", traced: false, want: "" },
  ])("$name", async ({ traced, want }) => {
    const html = await render(event("/", "en", traced), '<meta name="sentry-trace" content="%trace%" />');

    expect(html).toBe(`<meta name="sentry-trace" content="${want}" />`);
  });

  it.each([
    { name: "a page", method: "GET", route: "/", status: 200, want: { name: "GET /", code: SpanStatusCode.UNSET } },
    {
      name: "a refusal",
      method: "POST",
      route: "/",
      status: 400,
      want: { name: "POST /", code: SpanStatusCode.UNSET },
    },
    {
      name: "an unknown path",
      method: "GET",
      route: null,
      status: 404,
      want: { name: "GET", code: SpanStatusCode.UNSET },
    },
    { name: "a fault", method: "GET", route: "/", status: 500, want: { name: "GET /", code: SpanStatusCode.ERROR } },
  ])("traces the response to $name on the request's span", async ({ method, route, status, want }) => {
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
    const root = provider.getTracer("test").startSpan("sveltekit.handle.root");
    const request = {
      ...event("/"),
      request: new Request("https://template.test/", { method }),
      route: { id: route },
      tracing: { enabled: true, root, current: root },
    } as unknown as RequestEvent;

    await handle({ event: request, resolve: async () => new Response(null, { status }) });
    root.end();

    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe(want.name);
    expect(span?.attributes["http.response.status_code"]).toBe(status);
    expect(span?.status.code).toBe(want.code);
  });
});
