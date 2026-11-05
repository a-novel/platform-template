import { readPlatformDowntime } from "#lib/server/downtime.js";

import type { LayoutServerLoad } from "./$types";

import { TELEMETRY_CONSENT_COOKIE, parseTelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";
import { isDowntimeStarted } from "@a-novel-kit/nodelib-server";

export const load: LayoutServerLoad = async ({ cookies, locals }) => {
  const downtime = await readPlatformDowntime();

  return {
    locale: locals.locale,
    // The browser sends the visitor's telemetry answer, so the page renders it from the start.
    telemetryChoice: parseTelemetryChoice(cookies.get(TELEMETRY_CONSENT_COOKIE)),
    downtime,
    downtimeStarted: isDowntimeStarted(downtime),
  };
};
