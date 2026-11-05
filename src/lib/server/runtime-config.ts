import {
  type EnvironmentOutput,
  type EnvironmentSource,
  environmentHttpUrl,
  environmentInteger,
  parseEnvironment,
} from "@a-novel-kit/nodelib-server";

/** The public planned downtime document operators publish from infra. */
const defaultDowntimeUrl = "https://raw.githubusercontent.com/a-novel/infra/downtime/downtime.json";

const runtimeEnvironmentSchema = {
  accountUrl: environmentHttpUrl("ACCOUNT_URL"),
  authenticationServiceUrl: environmentHttpUrl("AUTHENTICATION_SERVICE_URL"),
  downtimeUrl: environmentHttpUrl("DOWNTIME_URL"),
  healthcheckTimeoutMs: environmentInteger("HEALTHCHECK_TIMEOUT_MS", {
    defaultValue: 2000,
    maximum: 10_000,
    minimum: 100,
  }),
  jsonKeysServiceUrl: environmentHttpUrl("JSON_KEYS_SERVICE_URL"),
  profileServiceUrl: environmentHttpUrl("PROFILE_SERVICE_URL"),
} as const;

/** RuntimeConfig contains the platform's private server settings. */
export type RuntimeConfig = EnvironmentOutput<typeof runtimeEnvironmentSchema> & {
  /** The file of the projected service token the platform sends to Authentication. Unset outside Kubernetes. */
  serviceTokenPath?: string;
  /** The file of the projected service token the platform sends to the profile service. Unset outside Kubernetes. */
  profileServiceTokenPath?: string;
};

/** Parses the platform's environment variables without retaining invalid values. */
export function parseRuntimeConfig(environment: EnvironmentSource): RuntimeConfig {
  return {
    ...parseEnvironment(
      { ...environment, DOWNTIME_URL: environment.DOWNTIME_URL ?? defaultDowntimeUrl },
      runtimeEnvironmentSchema
    ),
    serviceTokenPath: environment.SERVICE_TOKEN_PATH || undefined,
    profileServiceTokenPath: environment.PROFILE_SERVICE_TOKEN_PATH || undefined,
  };
}
