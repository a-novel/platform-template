import type { AccountScreenModel } from "#lib/application/auth/types.js";

import { createAccountScreenController } from "./controller.svelte";

import { describe, expect, it } from "vitest";

const unavailableAccount: AccountScreenModel = {
  claims: { status: "error", feedback: "sessionUnavailable" },
  logoutState: "ready",
};

describe("createAccountScreenController", () => {
  it("locks the account logout once while the recap is unavailable", () => {
    const controller = createAccountScreenController({ model: unavailableAccount, logoutAction: "?/logout" });
    expect(controller.submitLogout()).toBe(true);
    expect(controller.submitLogout()).toBe(false);
    expect(controller.state.model).toEqual({ ...unavailableAccount, logoutState: "submitting" });

    controller.synchronize(unavailableAccount);
    expect(controller.state).toEqual({ model: unavailableAccount, logoutAction: "?/logout" });
  });

  it("owns account logout without native submission", () => {
    const controller = createAccountScreenController({
      model: unavailableAccount,
      logoutAction: "?/logout",
      allowNativeSubmission: false,
    });
    expect(controller.submitLogout()).toBe(false);
    expect(controller.state.model.logoutState).toBe("submitting");
  });
});
