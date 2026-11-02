import { aggregateHealth } from "./health";
import type { RuntimeConfig } from "./runtime-config";

import { describe, expect, it, vi } from "vitest";

const config: RuntimeConfig = {
  authenticationServiceUrl: "http://authentication:8080/api",
  downtimeUrl: "http://downtime.test/downtime.json",
  healthcheckTimeoutMs: 500,
  accountUrl: "https://account.example.test",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("aggregateHealth", () => {
  it("reports service reachability and preserves its dependency map", async () => {
    const dependencies = {
      "api:jsonKeys": { status: "up" as const },
      "client:postgres": { latencyMs: 7, status: "up" as const },
      "client:smtp": { status: "up" as const },
    };
    const fetchImplementation = vi.fn<typeof globalThis.fetch>(async () => response(dependencies));

    const health = await aggregateHealth(fetchImplementation, () => config);

    expect(health).toEqual({
      services: {
        authentication: {
          dependencies,
          status: "up",
        },
      },
      status: "up",
    });
    const [url, init] = fetchImplementation.mock.calls[0] ?? [];
    expect(url).toEqual(new URL("http://authentication:8080/api/v2/healthcheck"));
    expect(new Headers(init?.headers).get("accept")).toBe("application/json");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps a reachable service up while a reported dependency makes the platform unavailable", async () => {
    const dependencies = {
      "api:jsonKeys": { status: "up" as const },
      "client:postgres": { detail: "connection refused", status: "down" as const },
      "client:smtp": { status: "up" as const },
    };
    const fetchImplementation = vi.fn<typeof globalThis.fetch>(async () => response(dependencies));

    const health = await aggregateHealth(fetchImplementation, () => config);

    expect(health).toEqual({
      services: {
        authentication: {
          dependencies,
          status: "up",
        },
      },
      status: "down",
    });
  });

  it("reports an unavailable service without fabricating dependency checks", async () => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>(async () => {
      throw new Error("connection details");
    });

    await expect(aggregateHealth(fetchImplementation, () => config)).resolves.toEqual({
      services: {
        authentication: {
          status: "down",
        },
      },
      status: "down",
    });
  });

  it("derives the unavailable service from the registry when runtime configuration fails", async () => {
    const fetchImplementation = vi.fn<typeof globalThis.fetch>();

    await expect(
      aggregateHealth(fetchImplementation, () => {
        throw new Error("private configuration detail");
      })
    ).resolves.toEqual({
      services: {
        authentication: {
          status: "down",
        },
      },
      status: "down",
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
