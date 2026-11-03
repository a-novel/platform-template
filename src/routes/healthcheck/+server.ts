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
    },
    // Probes prove the platform's identity like any call, but are made for no visitor.
    fetch: async (input, init) => {
      const { authenticationServiceAudience: audience, serviceTokenPath } = getRuntimeConfig();
      return await serviceFetch({ audience, serviceTokenPath }, fetch)(input, init);
    },
  });

  return json(health, {
    headers: {
      "cache-control": "no-store",
    },
    status: health.status === "up" ? 200 : 503,
  });
};
