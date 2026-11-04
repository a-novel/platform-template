import { parseRuntimeConfig } from "./runtime-config";

import { describe, expect, it } from "vitest";

const services = {
  ACCOUNT_URL: "http://account",
  AUTHENTICATION_SERVICE_URL: "http://authentication:8080",
  JSON_KEYS_SERVICE_URL: "http://json-keys:8080",
};

const invalidEnvironments = [
  [{ ...services, ACCOUNT_URL: undefined }, "ACCOUNT_URL"],
  [{ ...services, ACCOUNT_URL: "javascript:alert(1)" }, "ACCOUNT_URL"],
  [{ ...services, AUTHENTICATION_SERVICE_URL: "postgres://database" }, "AUTHENTICATION_SERVICE_URL"],
  [{ ...services, JSON_KEYS_SERVICE_URL: undefined }, "JSON_KEYS_SERVICE_URL"],
  [{ ...services, HEALTHCHECK_TIMEOUT_MS: "99" }, "HEALTHCHECK_TIMEOUT_MS"],
] as const;

describe("parseRuntimeConfig", () => {
  it("normalizes a valid service URL and default timeout", () => {
    expect(
      parseRuntimeConfig({
        ACCOUNT_URL: "https://account.example.test/",
        AUTHENTICATION_SERVICE_URL: "https://authentication.example.test/",
        JSON_KEYS_SERVICE_URL: "https://json-keys.example.test/",
      })
    ).toEqual({
      accountUrl: "https://account.example.test",
      authenticationServiceUrl: "https://authentication.example.test",
      downtimeUrl: "https://raw.githubusercontent.com/a-novel/infra/downtime/downtime.json",
      healthcheckTimeoutMs: 2000,
      jsonKeysServiceUrl: "https://json-keys.example.test",
    });
  });

  it("accepts an explicit bounded timeout", () => {
    expect(
      parseRuntimeConfig({
        ACCOUNT_URL: "http://localhost:4173",
        AUTHENTICATION_SERVICE_URL: "http://authentication:8080",
        DOWNTIME_URL: "http://downtime.test/downtime.json",
        HEALTHCHECK_TIMEOUT_MS: "750",
        JSON_KEYS_SERVICE_URL: "http://json-keys:8080",
      })
    ).toEqual({
      accountUrl: "http://localhost:4173",
      authenticationServiceUrl: "http://authentication:8080",
      downtimeUrl: "http://downtime.test/downtime.json",
      healthcheckTimeoutMs: 750,
      jsonKeysServiceUrl: "http://json-keys:8080",
    });
  });

  it.each(invalidEnvironments)("rejects invalid environment without echoing values", (environment, field) => {
    expect(() => parseRuntimeConfig(environment)).toThrow(`Invalid server environment: ${field}`);
  });
});
