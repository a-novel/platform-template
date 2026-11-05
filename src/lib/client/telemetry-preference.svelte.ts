import type { TelemetryPreference } from "#lib/ui/telemetry-preference.js";

import type { BrowserTelemetry, TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

/**
 * Tracks the visitor's telemetry answer. The server reads it from the browser's cookie, so the page
 * shows the same answer before and after it runs in the browser.
 */
export function createTelemetryPreference(
  telemetry: BrowserTelemetry,
  getChoice: () => TelemetryChoice | undefined
): TelemetryPreference {
  // The answer the server read, until the visitor gives another.
  let choice = $derived(getChoice());

  return {
    get choice() {
      return choice;
    },
    choose(next) {
      choice = next;
      void telemetry.choose(next);
    },
  };
}
