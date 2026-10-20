import type { AccountScreenModel } from "#lib/application/auth/types.js";
import { withLocale } from "#lib/i18n/provider.fixture.js";
import { expectFormActionLayout, submitForm } from "#lib/ui/forms.fixture.js";

import { createAccountScreenController } from "./controller.svelte";
import AccountScreen from "./screen.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import "@a-novel-kit/uikit-fonts/fonts.css";
import "@a-novel-kit/uikit-tokens/tokens.css";

const readyAccount: AccountScreenModel = {
  claims: {
    status: "ready",
    userId: "verified-user-id",
    roles: ["auth:user"],
    accessExpiresAt: "18 Aug 2026, 19:30",
    refreshExpiresAt: "25 Aug 2026, 18:30",
  },
  logoutState: "ready",
};

describe("account screen", () => {
  it("keeps the account logout mockable inside the session recap", async () => {
    await page.viewport(390, 844);
    const controller = createAccountScreenController({
      model: readyAccount,
      logoutAction: "/account?/logout",
      allowNativeSubmission: false,
    });

    render(AccountScreen, { controller }, withLocale());

    const form = await submitForm("Log out");
    expect(form.getAttribute("action")).toBe("/account?/logout");
    await expectFormActionLayout(form);
    const section = form.closest("section");
    if (!section) throw new Error("The logout form must belong to a section");
    const outer = page.getByRole("region", { name: "Your session" }).element().getBoundingClientRect();
    expect(outer.left).toBe(8);
    expect(form.getBoundingClientRect().left).toBe(outer.left);
    expect(section.getBoundingClientRect().left).toBe(outer.left);
    expect(controller.state.model.logoutState).toBe("submitting");
  });

  it.each(["en", "fr"] as const)("groups the %s logout explanation with its action", async (locale) => {
    await render(
      AccountScreen,
      {
        controller: createAccountScreenController({
          model: readyAccount,
          logoutAction: "/account?/logout",
          allowNativeSubmission: false,
        }),
      },
      withLocale(locale)
    );
    const button = page.getByRole("button", { name: locale === "fr" ? "Se déconnecter" : "Log out" });
    const description =
      locale === "fr" ? "Vous serez déconnecté sur cet appareil." : "You’ll be logged out on this device.";
    await expect.element(button).toHaveAccessibleDescription(description);
    const note = page.getByText(description).element();
    const details = page.getByRole("definition").elements().at(-1);
    if (!details) throw new Error("Expected session details");
    const originalViewport = { width: window.innerWidth, height: window.innerHeight };
    try {
      for (const width of [320, 390, 1280]) {
        await page.viewport(width, 844);
        const noteBounds = note.getBoundingClientRect();
        const actionGap = button.element().getBoundingClientRect().top - noteBounds.bottom;
        expect(actionGap).toBe(16);
        expect(noteBounds.top - details.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(actionGap * 2);
      }
    } finally {
      await page.viewport(originalViewport.width, originalViewport.height);
    }
  });

  it.each(["loading", "error"] as const)("keeps logout usable while the recap is %s", async (status) => {
    const controller = createAccountScreenController({
      model: {
        ...readyAccount,
        claims: status === "loading" ? { status } : { status, feedback: "sessionUnavailable" },
      },
      logoutAction: "/account?/logout",
      allowNativeSubmission: false,
    });
    render(AccountScreen, { controller }, withLocale());
    await expect.element(page.getByRole("region", { name: "Your session" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect.element(page.getByRole("button", { name: /Logging out/ })).toBeDisabled();
    expect(controller.state.model.claims.status).toBe(status);
  });
});
