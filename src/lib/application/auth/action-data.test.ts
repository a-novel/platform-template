import { readAuthenticationActionModel } from "./action-data";

import { describe, expect, it } from "vitest";

describe("readAuthenticationActionModel", () => {
  it("returns the action model of the active journey", () => {
    const model = {
      journey: "login" as const,
      state: { status: "service-error" as const, feedback: "serviceUnavailable" as const },
    };

    expect(readAuthenticationActionModel({ authentication: model }, "login")).toBe(model);
  });

  it.each([null, undefined, "invalid", {}, { authentication: null }])("ignores malformed action data %#", (data) => {
    expect(readAuthenticationActionModel(data, "login")).toBeNull();
  });
});
