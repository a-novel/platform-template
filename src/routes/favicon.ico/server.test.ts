import { GET } from "./+server";

import { describe, expect, it } from "vitest";

import { isRedirect } from "@sveltejs/kit";

describe("GET /favicon.ico", () => {
  it("points at the app's icon", () => {
    let response: unknown;
    try {
      GET({} as never);
    } catch (thrown) {
      response = thrown;
    }

    expect(isRedirect(response) && response.status).toBe(307);
    expect(isRedirect(response) && response.location).toMatch(/agora-icon\.png/);
  });
});
