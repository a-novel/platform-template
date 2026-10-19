import { GET } from "./+server";

import { describe, expect, it } from "vitest";

describe("GET /ping", () => {
  it("responds without consulting downstream services", async () => {
    const response = await GET({} as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("pong");
  });
});
