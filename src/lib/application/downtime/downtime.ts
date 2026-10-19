import type { Downtime } from "@a-novel-kit/nodelib-server";

/** Components whose planned downtime stops platform features: Authentication, and JSON Keys, which signs its tokens. */
const platformComponents = new Set(["service-authentication.database", "service-json-keys.database"]);

/** Keeps a planned downtime only when it stops platform features. */
export function platformDowntime(downtime: Downtime | null): Downtime | null {
  return downtime?.components.some((component) => platformComponents.has(component)) ? downtime : null;
}
