import { withLocale } from "#lib/i18n/provider.fixture.js";

import PrivacyStory from "./story.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

describe("privacy screen", () => {
  it("lets a visitor withdraw and give their telemetry consent", async () => {
    render(PrivacyStory, { telemetryChoice: "accepted" }, withLocale());

    await expect.element(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
    const setting = page.getByRole("switch", { name: /^Metrics and log collection/ });
    const label = page.getByText("Metrics and log collection");
    await expect.element(setting).toBeChecked();
    await label.click();
    await expect.element(setting).not.toBeChecked();
    await label.click();
    await expect.element(setting).toBeChecked();
  });

  it("says so when the platform collects nothing", async () => {
    render(PrivacyStory, { collects: false }, withLocale("fr"));

    await expect.element(page.getByRole("switch")).not.toBeInTheDocument();
    await expect.element(page.getByText("Nous ne collectons ni métriques ni journaux sur cet appareil.")).toBeVisible();
  });
});
