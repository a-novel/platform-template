import { withLocale } from "#lib/i18n/provider.fixture.js";

import Failure from "./failure.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

const links = { loginHref: "/?auth=login&returnTo=%2Faccount", homeHref: "/", retryHref: "/account?panel=email" };

const failureTitles = [
  [403, "Accès refusé"],
  [503, "Accès temporairement indisponible"],
  [404, "Page introuvable"],
  [500, "Page indisponible"],
] as const;

describe("error page presentation", () => {
  it.each(failureTitles)("localizes HTTP %s without showing internal error details", async (status, title) => {
    render(Failure, { ...links, status }, withLocale("fr"));
    await expect.element(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  });
});
