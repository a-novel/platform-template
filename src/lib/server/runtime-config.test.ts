import { parseRuntimeConfig } from "./runtime-config";

import { describe, expect, it } from "vitest";

const invalidEnvironments = [
  [{ AUTHENTICATION_SERVICE_URL: "http://authentication:8080" }, "ACCOUNT_URL"],
  [{ ACCOUNT_URL: "javascript:alert(1)", AUTHENTICATION_SERVICE_URL: "http://authentication:8080" }, "ACCOUNT_URL"],
  [{ ACCOUNT_URL: "http://account", AUTHENTICATION_SERVICE_URL: "postgres://database" }, "AUTHENTICATION_SERVICE_URL"],
  [
    {
      ACCOUNT_URL: "http://account",
      AUTHENTICATION_SERVICE_URL: "http://authentication:8080",
      HEALTHCHECK_TIMEOUT_MS: "99",
    },
    "HEALTHCHECK_TIMEOUT_MS",
  ],
] as const;

describe("parseRuntimeConfig", () => {
  it("normalizes a valid service URL and default timeout", () => {
    expect(
      parseRuntimeConfig({
        ACCOUNT_URL: "https://account.example.test/",
        AUTHENTICATION_SERVICE_URL: "https://authentication.example.test/",
      })
    ).toEqual({
      accountUrl: "https://account.example.test",
      authenticationServiceUrl: "https://authentication.example.test",
      downtimeUrl: "https://raw.githubusercontent.com/a-novel/infra/downtime/downtime.json",
      healthcheckTimeoutMs: 2000,
    });
  });

  it("accepts an explicit bounded timeout", () => {
    expect(
      parseRuntimeConfig({
        ACCOUNT_URL: "http://localhost:4173",
        AUTHENTICATION_SERVICE_URL: "http://authentication:8080",
        DOWNTIME_URL: "http://downtime.test/downtime.json",
        HEALTHCHECK_TIMEOUT_MS: "750",
      })
    ).toEqual({
      accountUrl: "http://localhost:4173",
      authenticationServiceUrl: "http://authentication:8080",
      downtimeUrl: "http://downtime.test/downtime.json",
      healthcheckTimeoutMs: 750,
    });
  });

  it.each(invalidEnvironments)("rejects invalid environment without echoing values", (environment, field) => {
    expect(() => parseRuntimeConfig(environment)).toThrow(`Invalid server environment: ${field}`);
  });
});
