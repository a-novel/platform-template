import { platformDowntime } from "#lib/application/downtime/downtime.js";

import { getRuntimeConfig } from "./runtime-config.server";

import { type Downtime, createDowntimeReader, isDowntimeStarted } from "@a-novel-kit/nodelib-server";

import { error } from "@sveltejs/kit";

// The document is public and the same for everyone, so one cached reader serves the process.
let read: (() => Promise<Downtime | null>) | undefined;

/** Reads the planned downtime that stops platform features, or null. A misconfigured server reads none. */
export async function readPlatformDowntime(): Promise<Downtime | null> {
  try {
    read ??= createDowntimeReader({ url: getRuntimeConfig().downtimeUrl });
  } catch {
    return null;
  }

  return platformDowntime(await read());
}

/** Fails with the 503 the error pages render as maintenance. */
export function downtimeError(): never {
  error(503, "Planned downtime", { downtime: true });
}

/** Stops a load or action that needs the stopped services once their planned downtime has started. */
export async function refuseDuringDowntime(): Promise<void> {
  if (isDowntimeStarted(await readPlatformDowntime())) downtimeError();
}
