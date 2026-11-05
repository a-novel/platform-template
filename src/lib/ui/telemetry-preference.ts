import { createContext } from "svelte";

import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

/** TelemetryPreference holds the visitor's answer about browser telemetry, which the Privacy page changes. */
export interface TelemetryPreference {
  /** Returns the visitor's answer, or undefined while they have not answered. */
  readonly choice: TelemetryChoice | undefined;
  /** Records a new answer, and starts or stops the telemetry to match it. */
  choose(choice: TelemetryChoice): void;
}

/**
 * Reads, installs and detects the telemetry preference, which the root layout installs when the
 * platform collects browser telemetry.
 */
export const [getTelemetryPreference, setTelemetryPreference, hasTelemetryPreference] =
  createContext<TelemetryPreference>();
