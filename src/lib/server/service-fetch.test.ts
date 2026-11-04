import { serviceFetch } from "./service-fetch";

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, onTestFinished, vi } from "vitest";

function headersOf(base: ReturnType<typeof vi.fn>, call = 0): Headers {
  return new Headers((base.mock.calls[call]?.[1] as RequestInit | undefined)?.headers);
}

describe("serviceFetch", () => {
  it("names the visitor and keeps the request's own headers", async () => {
    const base = vi.fn(async () => new Response("ok"));

    await serviceFetch({ visitorAddress: "192.0.2.1" }, base)("https://authentication.test/v2/session", {
      headers: { Authorization: "Bearer user" },
    });

    expect(headersOf(base).get("X-Client-IP")).toBe("192.0.2.1");
    expect(headersOf(base).get("Authorization")).toBe("Bearer user");
    expect(headersOf(base).has("X-Service-Authorization")).toBe(false);
  });

  it("sends the current projected service token on every call", async () => {
    const directory = await mkdtemp(join(tmpdir(), "service-token-"));
    onTestFinished(async () => await rm(directory, { recursive: true }));
    const tokenPath = join(directory, "token");
    const base = vi.fn(async () => new Response("ok"));
    const send = serviceFetch({ serviceTokenPath: tokenPath }, base);

    await writeFile(tokenPath, "service-token");
    await send("https://authentication.test/v2/healthcheck");
    await writeFile(tokenPath, "rotated-service-token");
    await send("https://authentication.test/v2/healthcheck");

    expect(headersOf(base, 0).get("X-Service-Authorization")).toBe("service-token");
    expect(headersOf(base, 1).get("X-Service-Authorization")).toBe("rotated-service-token");
    expect(headersOf(base, 1).has("X-Client-IP")).toBe(false);
  });
});
