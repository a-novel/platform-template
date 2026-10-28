import type { TelemetryPreference } from "#lib/ui/telemetry-preference.js";

import { onMount } from "svelte";

import type { BrowserTelemetry, TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

/**
 * Tracks the visitor's telemetry answer. The answer lives on the device, so it is read once the page
 * runs there. Call it during component initialization.
 */
export function createTelemetryPreference(telemetry: BrowserTelemetry): TelemetryPreference {
  let pending = $state(true);
  let choice = $state<TelemetryChoice | undefined>();

  onMount(() => {
    choice = telemetry.choice;
    pending = false;
  });

  return {
    get pending() {
      return pending;
    },
    get choice() {
      return choice;
    },
    choose(next) {
      choice = next;
      void telemetry.choose(next);
    },
  };
}
