import { withLocale } from "#lib/i18n/provider.fixture.js";
import type { TelemetryPreference } from "#lib/ui/telemetry-preference.js";

import PrivacyScreen from "./screen.svelte";

import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

function answer(choice: TelemetryChoice | undefined) {
  return { choice, choose: vi.fn<TelemetryPreference["choose"]>() };
}

describe("privacy screen", () => {
  it.each([
    ["withdraw", "accepted", "declined"],
    ["give", "declined", "accepted"],
  ] as const)("lets a visitor %s their telemetry consent", async (_, choice, next) => {
    const telemetry = answer(choice);
    render(PrivacyScreen, { telemetry }, withLocale());

    await page.getByText("Metrics and log collection").click();
    expect(telemetry.choose).toHaveBeenCalledExactlyOnceWith(next);
  });
});
