import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  // The service settings pass through as text. parseRuntimeConfig validates them on use, so a
  // misconfigured server still starts and reports itself unhealthy.
  ACCOUNT_URL: {
    schema: (value) => value,
    description: "Public URL of the account platform, where visitors manage their account.",
  },
  AUTHENTICATION_SERVICE_URL: {
    schema: (value) => value,
    description: "Base HTTP or HTTPS URL of the authentication service.",
  },
  JSON_KEYS_SERVICE_URL: {
    schema: (value) => value,
    description: "Base HTTP or HTTPS URL of the JSON keys service, whose public keys verify access tokens.",
  },
  SERVICE_TOKEN_PATH: {
    schema: (value) => value,
    description: "File of the projected service token the platform sends to services, on Kubernetes.",
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
  PUBLIC_CONSENT_DOMAIN: {
    public: true,
    schema: (value) => value || undefined,
    description:
      "Domain every Agora platform runs under, where the browser keeps the visitor's telemetry answer for all of them. Without it, the answer stays with this host.",
  },
  PUBLIC_FARO_URL: {
    public: true,
    schema: (value) => value || undefined,
    description:
      "Collector URL of the platform's Faro app. Without it, the browser reports nothing and asks no consent.",
  },
});
