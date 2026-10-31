import { validForm } from "#lib/application/auth/forms.fixture.js";
import { validateLogin } from "#lib/application/auth/forms.js";

import { readyAuthenticationModel } from "../controller.svelte";
import { createAuthenticationPanelController } from "./controller.svelte";

import { describe, expect, it } from "vitest";

describe("createAuthenticationPanelController", () => {
  it("returns shared validation before accepting corrected input", () => {
    const controller = createAuthenticationPanelController({ model: readyAuthenticationModel("login"), action: "/" });
    const invalid = new FormData();
    const expected = validateLogin(invalid);
    expect(controller.submit(invalid)).toBe(false);
    if (expected.success) throw new Error("Expected invalid form");
    expect(controller.state.model.state).toEqual({ status: "validation-error", issues: expected.issues });
    expect(controller.submit(validForm())).toBe(true);
    expect(controller.state.model.state).toEqual({ status: "submitting" });
    expect(JSON.stringify(controller.state)).not.toContain("new-password");
  });

  it("owns authentication submission without owning form fields", () => {
    const controller = createAuthenticationPanelController({
      model: readyAuthenticationModel("login"),
      action: "/auth",
      allowNativeSubmission: false,
    });

    expect(controller.submit(validForm())).toBe(false);
    expect(controller.state.model).toEqual({ journey: "login", state: { status: "submitting" } });
    expect(controller.submit(validForm())).toBe(false);

    controller.synchronize(
      { journey: "login", state: { status: "service-error", feedback: "serviceUnavailable" } },
      "/retry"
    );
    expect(controller.submit(validForm())).toBe(false);
    expect(controller.state).toEqual({
      model: { journey: "login", state: { status: "submitting" } },
      action: "/retry",
    });
  });

  it("masks a shown password whenever it synchronizes", () => {
    const controller = createAuthenticationPanelController({ model: readyAuthenticationModel("login"), action: "/" });
    controller.passwordVisibility.toggle();
    expect(controller.passwordVisibility.state.pressed).toBe(true);

    controller.synchronize(readyAuthenticationModel("login"), "/");
    expect(controller.passwordVisibility.state.pressed).toBe(false);
  });
});
