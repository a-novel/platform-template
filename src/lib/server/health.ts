import type { RuntimeConfig } from "./runtime-config";
import { getRuntimeConfig } from "./runtime-config.server";
import { serviceFetch } from "./service-fetch";

import { aggregateHealth as aggregateServiceHealth } from "@a-novel-kit/nodelib-server";

type RuntimeConfigReader = () => RuntimeConfig;

/** Probes the platform's service registry and preserves each service-owned dependency map. */
export function aggregateHealth(
  fetchImplementation: typeof globalThis.fetch,
  readConfig: RuntimeConfigReader = getRuntimeConfig
) {
  return aggregateServiceHealth({
    config: {
      authentication: () => {
        const config = readConfig();

        return {
          timeoutMs: config.healthcheckTimeoutMs,
          url: new URL("v2/healthcheck", `${config.authenticationServiceUrl}/`),
        };
      },
    },
    // Probes prove the platform's identity like any call, but are made for no visitor.
    fetch: async (input, init) =>
      await serviceFetch({ audience: readConfig().authenticationServiceAudience }, fetchImplementation)(input, init),
  });
}

/** PlatformHealth reports platform readiness and each product service result. */
export type PlatformHealth = Awaited<ReturnType<typeof aggregateHealth>>;
