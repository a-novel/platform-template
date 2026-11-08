import { withLocale } from "#lib/i18n/provider.fixture.js";

import AccessBoundary from "./AccessBoundary.svelte";

import { createRawSnippet } from "svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import type { AuthorizationStatus } from "@a-novel-kit/uikit/authorization";

const links = { homeHref: "/", retryHref: "/account?panel=email" };
const children = createRawSnippet(() => ({ render: () => "<p>Private content</p>" }));
const unavailable = createRawSnippet(() => ({ render: () => "<p>Blank public form</p>" }));

/**
 * The heading each unresolved or refused decision shows. The load sends an anonymous visitor to the
 * sign-in before the page renders, so an anonymous decision shows the access check.
 */
const statusTitles: [AuthorizationStatus, string][] = [
  ["pending", "Checking access"],
  ["anonymous", "Checking access"],
  ["forbidden", "Access denied"],
  ["unavailable", "Access temporarily unavailable"],
];

describe("protected page presentation", () => {
  it.each(statusTitles)("withholds private content for %s and shows %s", async (status, title) => {
    render(AccessBoundary, { ...links, controller: { state: { status } }, children }, withLocale());
    await expect.element(page.getByText("Private content")).not.toBeInTheDocument();
    await expect.element(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
    if (status === "unavailable")
      await expect
        .element(page.getByRole("link", { name: "Reload page" }))
        .toHaveAttribute("data-sveltekit-reload", "true");
  });

  it("renders authorized content without a status page", async () => {
    render(AccessBoundary, { ...links, controller: { state: { status: "allowed" } }, children }, withLocale());
    await expect.element(page.getByText("Private content")).toBeVisible();
    await expect.element(page.getByRole("heading")).not.toBeInTheDocument();
  });

  it("allows an explicit public fallback during outages without exposing protected content", async () => {
    render(
      AccessBoundary,
      { ...links, controller: { state: { status: "unavailable" } }, children, unavailable },
      withLocale()
    );
    await expect.element(page.getByText("Blank public form")).toBeVisible();
    await expect.element(page.getByText("Private content")).not.toBeInTheDocument();
  });
});
