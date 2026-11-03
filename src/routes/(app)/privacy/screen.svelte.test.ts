import { withLocale } from "#lib/i18n/provider.fixture.js";
import type { TelemetryPreference } from "#lib/ui/telemetry-preference.js";

import PrivacyScreen from "./screen.svelte";

import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

function answer(choice: TelemetryChoice | undefined, pending = false) {
  return { pending, choice, choose: vi.fn<TelemetryPreference["choose"]>() };
}

describe("privacy screen", () => {
  it.each([
    ["withdraw", "accepted", "declined"],
    ["give", "declined", "accepted"],
  ] as const)("lets a visitor %s their telemetry consent", async (_, choice, next) => {
    const telemetry = answer(choice);
    render(PrivacyScreen, { telemetry }, withLocale());

    await expect.element(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
    const setting = page.getByRole("switch", { name: /^Metrics and log collection/ });
    if (choice === "accepted") await expect.element(setting).toBeChecked();
    else await expect.element(setting).not.toBeChecked();
    await page.getByText("Metrics and log collection").click();
    expect(telemetry.choose).toHaveBeenCalledExactlyOnceWith(next);
  });

  it("waits for the device's answer before offering to change it", async () => {
    render(PrivacyScreen, { telemetry: answer(undefined, true) }, withLocale());

    await expect.element(page.getByRole("switch")).toBeDisabled();
  });

  it("says so when the platform collects nothing", async () => {
    render(PrivacyScreen, { telemetry: null }, withLocale("fr"));

    await expect.element(page.getByRole("switch")).not.toBeInTheDocument();
    await expect.element(page.getByText("Nous ne collectons ni métriques ni journaux sur cet appareil.")).toBeVisible();
  });
});
