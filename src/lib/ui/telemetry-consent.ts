import { createContext } from "svelte";

import type { ConsentController } from "@a-novel-kit/uikit";

/**
 * Reads, installs and detects the telemetry consent request that the root layout installs when the
 * platform collects browser telemetry. The shell reopens it so visitors can change their answer.
 */
export const [getTelemetryConsent, setTelemetryConsent, hasTelemetryConsent] = createContext<ConsentController>();
