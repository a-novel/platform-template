import { withLocale } from "#lib/i18n/provider.fixture.js";

import Screen from "./screen.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

const retryHref = "/auth/sign-in?returnTo=%2Fprivacy";

describe("failed sign-in presentation", () => {
  const failures = [
    ["rejected", "en", "We couldn’t log you in", "The login took too long or was interrupted. Please try again."],
    ["unavailable", "fr", "Nous n’avons pas pu vous connecter", "La connexion est temporairement indisponible."],
    ["rate-limited", "en", "We couldn’t log you in", "Too many attempts."],
  ] as const;

  it.each(failures)("explains a %s sign-in in %s", async (failure, locale, title, description) => {
    render(Screen, { failure, retryHref }, withLocale(locale));

    await expect.element(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect.element(page.getByText(description, { exact: false })).toBeVisible();
  });

  it("retries through the sign-in route with a full page load", async () => {
    render(Screen, { failure: "rejected", retryHref }, withLocale());

    const retry = page.getByRole("link", { name: "Try again" });
    await expect.element(retry).toHaveAttribute("href", retryHref);
    await expect.element(retry).toHaveAttribute("data-sveltekit-reload", "true");
  });
});
