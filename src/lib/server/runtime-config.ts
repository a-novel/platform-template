import {
  type EnvironmentOutput,
  type EnvironmentSource,
  environmentHttpUrl,
  environmentInteger,
  environmentOptional,
  parseEnvironment,
} from "@a-novel-kit/nodelib-server";

const runtimeEnvironmentSchema = {
  accountUrl: environmentHttpUrl("ACCOUNT_URL"),
  authenticationServiceUrl: environmentHttpUrl("AUTHENTICATION_SERVICE_URL"),
  // The public planned downtime document operators publish from infra.
  downtimeUrl: environmentHttpUrl("DOWNTIME_URL", {
    defaultValue: "https://raw.githubusercontent.com/a-novel/infra/downtime/downtime.json",
  }),
  healthcheckTimeoutMs: environmentInteger("HEALTHCHECK_TIMEOUT_MS", {
    defaultValue: 2000,
    maximum: 10_000,
    minimum: 100,
  }),
  jsonKeysServiceUrl: environmentHttpUrl("JSON_KEYS_SERVICE_URL"),
  profileServiceUrl: environmentHttpUrl("PROFILE_SERVICE_URL"),
  // The files of the projected service tokens the platform sends to Authentication and to the profile
  // service. Unset outside Kubernetes.
  serviceTokenPath: environmentOptional("SERVICE_TOKEN_PATH"),
  profileServiceTokenPath: environmentOptional("PROFILE_SERVICE_TOKEN_PATH"),
} as const;

/** RuntimeConfig contains the platform's private server settings. */
export type RuntimeConfig = EnvironmentOutput<typeof runtimeEnvironmentSchema>;

/** Parses the platform's environment variables without retaining invalid values. */
export function parseRuntimeConfig(environment: EnvironmentSource): RuntimeConfig {
  return parseEnvironment(environment, runtimeEnvironmentSchema);
}
