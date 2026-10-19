import I18nProvider from "#lib/i18n/I18nProvider.svelte";

import Failure from "./failure.svelte";
import Screen from "./screen.svelte";

import { createRawSnippet } from "svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import type { AuthorizationStatus } from "@a-novel-kit/uikit/authorization";

const links = { loginHref: "/?auth=login&returnTo=%2Faccount", homeHref: "/", retryHref: "/account?panel=email" };
const children = createRawSnippet(() => ({ render: () => "<p>Private content</p>" }));
const unavailable = createRawSnippet(() => ({ render: () => "<p>Blank public form</p>" }));
const wrapper = { wrapper: I18nProvider, wrapperProps: { locale: "en" as const } };

const failureTitles = [
  [403, "Accès refusé"],
  [503, "Accès temporairement indisponible"],
  [404, "Page introuvable"],
  [500, "Page indisponible"],
] as const;

describe("protected page presentation", () => {
  it.each<AuthorizationStatus>(["pending", "anonymous", "forbidden", "unavailable"])(
    "withholds private content for %s",
    async (status) => {
      render(Screen, { ...links, controller: { state: { status } }, children }, wrapper);
      await expect.element(page.getByText("Private content")).not.toBeInTheDocument();
      await expect.element(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (status === "anonymous")
        await expect
          .element(page.getByRole("link", { name: "Log in", exact: true }))
          .toHaveAttribute("href", links.loginHref);
      if (status === "unavailable")
        await expect
          .element(page.getByRole("link", { name: "Reload page" }))
          .toHaveAttribute("data-sveltekit-reload", "true");
    }
  );

  it("renders authorized content without a status page", async () => {
    render(Screen, { ...links, controller: { state: { status: "allowed" } }, children }, wrapper);
    await expect.element(page.getByText("Private content")).toBeVisible();
    await expect.element(page.getByRole("heading")).not.toBeInTheDocument();
  });

  it("allows an explicit public fallback during outages without exposing protected content", async () => {
    render(Screen, { ...links, controller: { state: { status: "unavailable" } }, children, unavailable }, wrapper);
    await expect.element(page.getByText("Blank public form")).toBeVisible();
    await expect.element(page.getByText("Private content")).not.toBeInTheDocument();
  });

  it.each(failureTitles)("localizes HTTP %s without showing internal error details", async (status, title) => {
    render(Failure, { ...links, status }, { wrapper: I18nProvider, wrapperProps: { locale: "fr" } });
    await expect.element(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  });
});
