import type { AccountScreenModel, AuthenticationPanelModel } from "#lib/application/auth/types.js";
import I18nProvider from "#lib/i18n/I18nProvider.svelte";

import { createAccountScreenController } from "../account/controller.svelte";
import AccountScreen from "../account/screen.svelte";
import { createAuthenticationPanelController } from "./controller.svelte";
import AuthenticationPanel from "./screen.svelte";

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

function withLocale(locale: "en" | "fr" = "en") {
  return {
    wrapper: I18nProvider,
    wrapperProps: { locale },
  };
}

function authenticationController(model: AuthenticationPanelModel) {
  return createAuthenticationPanelController({
    model,
    action: "/auth?/login",
    allowNativeSubmission: false,
  });
}

async function submitForm(buttonName: string): Promise<HTMLFormElement> {
  const buttonLocator = page.getByRole("button", { name: buttonName });
  await expect.element(buttonLocator).toBeVisible();
  const button = buttonLocator.element() as HTMLButtonElement;
  const form = button.form;
  expect(form).not.toBeNull();

  form?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  return form as HTMLFormElement;
}

async function expectFormActionLayout(form: HTMLFormElement) {
  const button = form.querySelector('button[type="submit"]');
  expect(button).not.toBeNull();
  if (!button) return;

  const originalViewport = { width: window.innerWidth, height: window.innerHeight };
  try {
    for (const width of [320, 390, 1280]) {
      await page.viewport(width, 844);
      const bounds = button.getBoundingClientRect();
      const formBounds = form.getBoundingClientRect();
      expect(bounds.left).toBeCloseTo(formBounds.left);
      if (width < 560) expect(bounds.width).toBeCloseTo(formBounds.width);
      else expect(bounds.width).toBeLessThan(formBounds.width);
      const feedback = form.querySelector('[role="alert"], [role="status"]');
      if (feedback) expect(bounds.top - feedback.getBoundingClientRect().bottom).toBe(16);
      const lastInput = Array.from(form.querySelectorAll("input")).at(-1);
      if (lastInput)
        expect(
          (feedback ?? button).getBoundingClientRect().top - lastInput.getBoundingClientRect().bottom
        ).toBeGreaterThanOrEqual(32);
    }
  } finally {
    await page.viewport(originalViewport.width, originalViewport.height);
  }
}

describe("pure authentication screens", () => {
  it("delegates login submission without owning credential state", async () => {
    const controller = authenticationController({ journey: "login", state: { status: "ready" } });

    render(AuthenticationPanel, { controller }, withLocale());

    await page.getByLabelText(/Email address/).fill("creator@example.test");
    await page.getByLabelText(/Password/).fill("valid-example-password");
    const form = await submitForm("Log in");

    await expectFormActionLayout(form);
    expect(form.getAttribute("action")).toBe("/auth?/login");
    expect(form.getAttribute("method")).toBe("POST");
    expect(controller.state.model.state.status).toBe("submitting");
    expect(Object.fromEntries(new FormData(form))).toEqual({
      email: "creator@example.test",
      password: "valid-example-password",
    });
    await expect.element(page.getByLabelText(/Email address/)).toHaveAttribute("name", "email");
    await expect.element(page.getByLabelText(/Password/)).toHaveAttribute("name", "password");
  });

  it("locks an in-flight login at the pure view boundary", async () => {
    render(
      AuthenticationPanel,
      {
        controller: authenticationController({ journey: "login", state: { status: "submitting" } }),
      },
      withLocale()
    );

    const button = page.getByRole("button", { name: /Logging in/ });
    await expect.element(button).toBeDisabled();
    expect(button.element().querySelector('[role="status"]')).toBeNull();
    await expect.element(page.getByLabelText(/Email address/)).toHaveAttribute("readonly");
    await expect.element(page.getByLabelText(/Password/)).toHaveAttribute("readonly");
  });

  it("keeps validation feedback beside fields and places service failures before submit", async () => {
    const validation = await render(
      AuthenticationPanel,
      {
        controller: authenticationController({
          journey: "login",
          state: {
            status: "validation-error",
            issues: [
              { field: "email", feedback: "email" },
              { field: "password", feedback: "password" },
            ],
          },
        }),
      },
      withLocale()
    );

    await expect.element(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect.element(page.getByText("Enter your password.")).toBeVisible();
    expect(document.querySelector('a[href$="-email"]')).toBeNull();
    validation.unmount();

    await render(
      AuthenticationPanel,
      {
        controller: authenticationController({
          journey: "login",
          state: { status: "service-error", feedback: "serviceUnavailable" },
        }),
      },
      withLocale()
    );

    const alert = page.getByRole("alert").element();
    const submit = page.getByRole("button", { name: "Log in" }).element();
    expect(alert.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    await expect.element(page.getByRole("alert")).toMatchTextContent("Temporarily unavailable");
    await expect.element(page.getByRole("alert")).toMatchTextContent("Please try again in a few minutes.");
    const form = (submit as HTMLButtonElement).form;
    if (!form) throw new Error("Submit button must belong to a form");
    await expectFormActionLayout(form);
  });

  it("translates stable feedback codes through the active locale", async () => {
    const validation = await render(
      AuthenticationPanel,
      {
        controller: authenticationController({
          journey: "login",
          state: {
            status: "validation-error",
            issues: [
              { field: "email", feedback: "email" },
              { field: "password", feedback: "password" },
            ],
          },
        }),
      },
      withLocale("fr")
    );

    await expect.element(page.getByText("Saisissez un courriel valide.")).toBeVisible();
    await expect.element(page.getByText("Saisissez votre mot de passe.")).toBeVisible();
    validation.unmount();

    render(
      AuthenticationPanel,
      {
        controller: authenticationController({
          journey: "login",
          state: { status: "service-error", feedback: "invalidCredentials" },
        }),
      },
      withLocale("fr")
    );

    await expect.element(page.getByText("Le courriel ou le mot de passe est incorrect.")).toBeVisible();
  });

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
