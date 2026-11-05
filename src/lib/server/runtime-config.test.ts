import { parseRuntimeConfig } from "./runtime-config";

import { describe, expect, it } from "vitest";

const services = {
  ACCOUNT_URL: "http://account",
  AUTHENTICATION_SERVICE_URL: "http://authentication:8080",
  JSON_KEYS_SERVICE_URL: "http://json-keys:8080",
  PROFILE_SERVICE_URL: "http://profile:8080",
};

const invalidEnvironments = [
  [{ ...services, ACCOUNT_URL: undefined }, "ACCOUNT_URL"],
  [{ ...services, ACCOUNT_URL: "javascript:alert(1)" }, "ACCOUNT_URL"],
  [{ ...services, AUTHENTICATION_SERVICE_URL: "postgres://database" }, "AUTHENTICATION_SERVICE_URL"],
  [{ ...services, JSON_KEYS_SERVICE_URL: undefined }, "JSON_KEYS_SERVICE_URL"],
  [{ ...services, PROFILE_SERVICE_URL: "ftp://profile" }, "PROFILE_SERVICE_URL"],
  [{ ...services, HEALTHCHECK_TIMEOUT_MS: "99" }, "HEALTHCHECK_TIMEOUT_MS"],
] as const;

describe("parseRuntimeConfig", () => {
  it("normalizes a valid service URL and default timeout", () => {
    expect(
      parseRuntimeConfig({
        ACCOUNT_URL: "https://account.example.test/",
        AUTHENTICATION_SERVICE_URL: "https://authentication.example.test/",
        JSON_KEYS_SERVICE_URL: "https://json-keys.example.test/",
        PROFILE_SERVICE_URL: "https://profile.example.test/",
      })
    ).toEqual({
      accountUrl: "https://account.example.test",
      authenticationServiceUrl: "https://authentication.example.test",
      downtimeUrl: "https://raw.githubusercontent.com/a-novel/infra/downtime/downtime.json",
      healthcheckTimeoutMs: 2000,
      jsonKeysServiceUrl: "https://json-keys.example.test",
      profileServiceUrl: "https://profile.example.test",
    });
  });

  it("accepts an explicit bounded timeout and the token of each service", () => {
    expect(
      parseRuntimeConfig({
        ACCOUNT_URL: "http://localhost:4173",
        AUTHENTICATION_SERVICE_URL: "http://authentication:8080",
        DOWNTIME_URL: "http://downtime.test/downtime.json",
        HEALTHCHECK_TIMEOUT_MS: "750",
        JSON_KEYS_SERVICE_URL: "http://json-keys:8080",
        PROFILE_SERVICE_TOKEN_PATH: "/var/run/secrets/profile/token",
        PROFILE_SERVICE_URL: "http://profile:8080",
        SERVICE_TOKEN_PATH: "/var/run/secrets/authentication/token",
      })
    ).toEqual({
      accountUrl: "http://localhost:4173",
      authenticationServiceUrl: "http://authentication:8080",
      downtimeUrl: "http://downtime.test/downtime.json",
      healthcheckTimeoutMs: 750,
      jsonKeysServiceUrl: "http://json-keys:8080",
      profileServiceUrl: "http://profile:8080",
      profileServiceTokenPath: "/var/run/secrets/profile/token",
      serviceTokenPath: "/var/run/secrets/authentication/token",
    });
  });

  it.each(invalidEnvironments)("rejects invalid environment without echoing values", (environment, field) => {
    expect(() => parseRuntimeConfig(environment)).toThrow(`Invalid server environment: ${field}`);
  });
});
