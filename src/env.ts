import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  // The service settings pass through as text. parseRuntimeConfig validates them on use, so a
  // misconfigured server still starts and reports itself unhealthy.
  AUTHENTICATION_SERVICE_AUDIENCE: {
    schema: (value) => value,
    description: "Audience of the Google ID token the authentication service's IAM admits, on Cloud Run.",
  },
  AUTHENTICATION_SERVICE_URL: {
    schema: (value) => value,
    description: "Base HTTP or HTTPS URL of the authentication service.",
  },
  HEALTHCHECK_TIMEOUT_MS: {
    schema: (value) => value,
    description: "Timeout of each downstream readiness probe, from 100 to 10,000 ms.",
  },
  DOWNTIME_URL: {
    schema: (value) => value,
    description: "Planned downtime document. Defaults to the one infra publishes.",
  },
  OTEL: {
    schema: (value) => value === "true",
    description: "Records and exports traces when `true`.",
  },
  PUBLIC_SENTRY_DSN: {
    public: true,
    schema: (value) => value || undefined,
    description:
      "Sentry project of the browser telemetry. Without it, the browser reports nothing and asks no consent.",
  },
});
