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
  authenticationServiceUrl: environmentHttpUrl("AUTHENTICATION_SERVICE_URL"),
  downtimeUrl: environmentHttpUrl("DOWNTIME_URL"),
  healthcheckTimeoutMs: environmentInteger("HEALTHCHECK_TIMEOUT_MS", {
    defaultValue: 2000,
    maximum: 10_000,
    minimum: 100,
  }),
} as const;

/** RuntimeConfig contains the platform's private server settings. */
export type RuntimeConfig = EnvironmentOutput<typeof runtimeEnvironmentSchema> & {
  /** The audience of the ID token Authentication's IAM admits. Unset outside Cloud Run. */
  authenticationServiceAudience?: string;
};

/** Parses the platform's environment variables without retaining invalid values. */
export function parseRuntimeConfig(environment: EnvironmentSource): RuntimeConfig {
  return {
    ...parseEnvironment(
      { ...environment, DOWNTIME_URL: environment.DOWNTIME_URL ?? defaultDowntimeUrl },
      runtimeEnvironmentSchema
    ),
    authenticationServiceAudience: environment.AUTHENTICATION_SERVICE_AUDIENCE || undefined,
  };
}
