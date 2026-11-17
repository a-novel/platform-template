import { getRuntimeConfig } from "#lib/server/runtime-config.server.js";
import { serviceFetch } from "#lib/server/service-fetch.js";

import type { RequestHandler } from "./$types";

import { aggregateHealth } from "@a-novel-kit/nodelib-server";

import { json } from "@sveltejs/kit";

/** Probes the platform's service registry and preserves each service-owned dependency map. */
export const GET: RequestHandler = async ({ fetch }) => {
  const health = await aggregateHealth({
    // The profile service only decorates the rail, which falls back to initials without it, so its
    // outage leaves the platform ready and goes unprobed.
    config: {
      authentication: () => {
        const config = getRuntimeConfig();

        return {
          timeoutMs: config.healthcheckTimeoutMs,
          url: new URL("v2/healthcheck", `${config.authenticationServiceUrl}/`),
          // The probe proves the platform's identity like any call, but is made for no visitor.
          fetch: serviceFetch({ serviceTokenPath: config.serviceTokenPath }, fetch),
        };
      },
      // JSON keys' API is public, so its probe carries no token.
      jsonKeys: () => {
        const config = getRuntimeConfig();

        return {
          timeoutMs: config.healthcheckTimeoutMs,
          url: new URL("v2/healthcheck", `${config.jsonKeysServiceUrl}/`),
        };
      },
    },
    fetch,
  });

  return json(health, {
    headers: {
      "cache-control": "no-store",
    },
    status: health.status === "up" ? 200 : 503,
  });
};
