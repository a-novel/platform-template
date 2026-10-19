import {
  AUTHENTICATION_SERVICE_AUDIENCE,
  AUTHENTICATION_SERVICE_URL,
  DOWNTIME_URL,
  HEALTHCHECK_TIMEOUT_MS,
} from "$app/env/private";

import { type RuntimeConfig, parseRuntimeConfig } from "./runtime-config";

export function getRuntimeConfig(): RuntimeConfig {
  return parseRuntimeConfig({
    AUTHENTICATION_SERVICE_AUDIENCE,
    AUTHENTICATION_SERVICE_URL,
    DOWNTIME_URL,
    HEALTHCHECK_TIMEOUT_MS,
  });
}
