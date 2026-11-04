import { getRuntimeConfig } from "#lib/server/runtime-config.server.js";
import { serviceFetch } from "#lib/server/service-fetch.js";

import type { RequestHandler } from "./$types";

import { aggregateHealth } from "@a-novel-kit/nodelib-server";

import { json } from "@sveltejs/kit";

/** Probes the platform's service registry and preserves each service-owned dependency map. */
export const GET: RequestHandler = async ({ fetch }) => {
  const health = await aggregateHealth({
    config: {
      authentication: () => {
        const config = getRuntimeConfig();

        return {
          timeoutMs: config.healthcheckTimeoutMs,
          url: new URL("v2/healthcheck", `${config.authenticationServiceUrl}/`),
        };
      },
      jsonKeys: () => {
        const config = getRuntimeConfig();

        return {
          timeoutMs: config.healthcheckTimeoutMs,
          url: new URL("v2/healthcheck", `${config.jsonKeysServiceUrl}/`),
        };
      },
    },
    // Probes prove the platform's identity to Authentication like any call, but are made for no
    // visitor. JSON keys' API is public, so its probe carries no token.
    fetch: async (input, init) => {
      const { authenticationServiceUrl, serviceTokenPath } = getRuntimeConfig();
      const identity = String(input).startsWith(`${authenticationServiceUrl}/`) ? { serviceTokenPath } : {};
      return await serviceFetch(identity, fetch)(input, init);
    },
  });

  return json(health, {
    headers: {
      "cache-control": "no-store",
    },
    status: health.status === "up" ? 200 : 503,
  });
};
