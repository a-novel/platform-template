import type { RuntimeConfig } from "#lib/server/runtime-config.js";

import { GET } from "./+server";

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const readConfig = vi.hoisted(() => vi.fn<() => RuntimeConfig>());

vi.mock("#lib/server/runtime-config.server.js", () => ({ getRuntimeConfig: readConfig }));

const config: RuntimeConfig = {
  authenticationServiceUrl: "http://authentication:8080/api",
  downtimeUrl: "http://downtime.test/downtime.json",
  healthcheckTimeoutMs: 500,
  accountUrl: "https://account.example.test",
  jsonKeysServiceUrl: "http://json-keys:8080",
  profileServiceUrl: "http://profile:8080",
};

const authenticationDependencies = {
  "api:jsonKeys": { status: "up" as const },
  "client:postgres": { latencyMs: 7, status: "up" as const },
  "client:smtp": { status: "up" as const },
};
const jsonKeysDependencies = { "client:postgres": { status: "up" as const } };

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

/** Answers each service's probe with the dependency map it reports. */
function answer(authentication: unknown): typeof globalThis.fetch {
  return async (input) =>
    response(String(input).startsWith(config.jsonKeysServiceUrl) ? jsonKeysDependencies : authentication);
}

/** Probes the platform through its route, and returns the status and the health report. */
async function probe(fetchImplementation: typeof globalThis.fetch) {
  const response = await GET({ fetch: fetchImplementation } as never);
  return { status: response.status, health: await response.json() };
}

beforeEach(() => {
  readConfig.mockReset().mockReturnValue(config);
});

describe("GET /healthcheck", () => {
  it("reports service reachability and preserves its dependency map", async () => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>(answer(authenticationDependencies));

    await expect(probe(fetchImplementation)).resolves.toEqual({
      status: 200,
      health: {
        services: {
          authentication: { dependencies: authenticationDependencies, status: "up" },
          jsonKeys: { dependencies: jsonKeysDependencies, status: "up" },
        },
        status: "up",
      },
    });
    expect(fetchImplementation.mock.calls.map(([url]) => url)).toEqual([
      new URL("http://authentication:8080/api/v2/healthcheck"),
      new URL("http://json-keys:8080/v2/healthcheck"),
    ]);
    for (const [, init] of fetchImplementation.mock.calls) {
      expect(new Headers(init?.headers).get("accept")).toBe("application/json");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("proves the platform's identity to Authentication alone", async () => {
    const serviceTokenPath = join(await mkdtemp(join(tmpdir(), "healthcheck-")), "token");
    await writeFile(serviceTokenPath, "service-token");
    readConfig.mockReturnValue({ ...config, serviceTokenPath });
    const fetchImplementation = vi.fn<typeof globalThis.fetch>(answer(authenticationDependencies));

    await probe(fetchImplementation);

    const tokens = fetchImplementation.mock.calls.map(([url, init]) => [
      String(url),
      new Headers(init?.headers).get("x-service-authorization"),
    ]);
    expect(Object.fromEntries(tokens)).toEqual({
      "http://authentication:8080/api/v2/healthcheck": "service-token",
      "http://json-keys:8080/v2/healthcheck": null,
    });
  });

  it("keeps a reachable service up while a reported dependency makes the platform unavailable", async () => {
    const dependencies = {
      ...authenticationDependencies,
      "client:postgres": { detail: "connection refused", status: "down" as const },
    };

    await expect(probe(answer(dependencies))).resolves.toEqual({
      status: 503,
      health: {
        services: {
          authentication: { dependencies, status: "up" },
          jsonKeys: { dependencies: jsonKeysDependencies, status: "up" },
        },
        status: "down",
      },
    });
  });

  it("reports an unavailable service without fabricating dependency checks", async () => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>(async () => {
      throw new Error("connection details");
    });

    await expect(probe(fetchImplementation)).resolves.toEqual({
      status: 503,
      health: {
        services: { authentication: { status: "down" }, jsonKeys: { status: "down" } },
        status: "down",
      },
    });
  });

  it("derives the unavailable services from the registry when runtime configuration fails", async () => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>();
    readConfig.mockImplementation(() => {
      throw new Error("private configuration detail");
    });

    await expect(probe(fetchImplementation)).resolves.toEqual({
      status: 503,
      health: {
        services: { authentication: { status: "down" }, jsonKeys: { status: "down" } },
        status: "down",
      },
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
