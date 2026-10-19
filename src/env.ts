import { defineEnvVars } from "@sveltejs/kit/env";

// parseRuntimeConfig validates these on use, so a misconfigured server still starts and reports
// itself unhealthy instead of failing at boot.
export const variables = defineEnvVars({
  AUTHENTICATION_SERVICE_AUDIENCE: { schema: (value) => value },
  AUTHENTICATION_SERVICE_URL: { schema: (value) => value },
  HEALTHCHECK_TIMEOUT_MS: { schema: (value) => value },
  DOWNTIME_URL: { schema: (value) => value },
  OTEL: {
    schema: (value) => value === "true",
    description: "Records and exports traces when `true`.",
  },
  GCLOUD_PROJECT_ID: {
    schema: (value) => value || undefined,
    description: "Exports traces to this Google Cloud project; without it, they print to standard output.",
  },
});
