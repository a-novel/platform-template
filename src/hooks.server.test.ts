import { handle } from "./hooks.server";

import { describe, expect, it, vi } from "vitest";

import type { RequestEvent } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";

function event(path: string, language?: string): RequestEvent {
  const url = new URL(path, "https://template.test");
  return {
    url,
    locals: {},
    request: new Request(url, { headers: language ? { "accept-language": language } : undefined }),
  } as RequestEvent;
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
});
