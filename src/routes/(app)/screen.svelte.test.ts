import type { ShellViewModel } from "#lib/application/shell/types.js";
import { createI18n } from "#lib/i18n/instance.js";
import { withLocale } from "#lib/i18n/provider.fixture.js";

import { createAuthenticationPanelController } from "./(authentication)/controller.svelte";
import { createShellController, readyAuthenticationModel } from "./controller.svelte";
import Screen from "./screen.svelte";
import ShellStory from "./story.svelte";

import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import { Alert } from "@a-novel-kit/uikit";
import "@a-novel-kit/uikit-fonts/fonts.css";
import "@a-novel-kit/uikit-tokens/tokens.css";

function model(patch: Partial<ShellViewModel> = {}): ShellViewModel {
  return {
    activeNavigation: "home",
    authView: null,
    drawerOpen: false,
    rail: "expanded",
    session: { status: "anonymous" },
    ...patch,
  };
}

function controller(patch: Partial<ShellViewModel> = {}) {
  const authentication = createAuthenticationPanelController({
    model: readyAuthenticationModel("login"),
    action: "/auth",
    allowNativeSubmission: false,
  });

  return createShellController({
    model: model(patch),
    homeHref: "/",
    accountHref: "/account",
    privacyHref: "/privacy",
    logoutAction: "/auth/logout",
    authentication,
    resolveAuthentication: (view) => ({ model: readyAuthenticationModel(view), action: "/auth" }),
    allowNativeLogout: false,
  });
}

/** Reads the styles that tell a control's states apart, once its transitions have settled. */
async function settledStyle(element: Element) {
  await new Promise(requestAnimationFrame);
  for (const animation of element.getAnimations()) animation.finish();
  await new Promise(requestAnimationFrame);
  const style = getComputedStyle(element);
  return {
    background: style.backgroundColor,
    color: style.color,
    opacity: style.opacity,
    weight: style.fontWeight,
    lineHeight: style.lineHeight,
    padding: style.padding,
  };
}

const sessionFeedback = [
  [320, "loading"],
  [320, "error"],
  [1280, "loading"],
  [1280, "error"],
] as const;

describe("shell screen", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it("exposes the empty workspace, current Home destination, and anonymous authentication action", async () => {
    const shell = controller();
    render(Screen, { controller: shell }, withLocale());

    await expect.element(page.getByRole("main")).toBeVisible();
    await expect.element(page.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await expect.element(page.getByRole("img", { name: "Agora" })).toHaveAttribute("width", "96");
    const signIn = page.getByRole("link", { name: "Log in" });
    expect(getComputedStyle(signIn.element()).justifyContent).toBe("flex-start");
    await signIn.click();

    expect(shell.state.model.authView).toBe("login");
  });

  it("keeps the collapsed Home destination accessible by name", async () => {
    render(
      Screen,
      {
        controller: controller({ rail: "collapsed" }),
      },
      withLocale("fr")
    );

    await expect.element(page.getByRole("link", { name: "Accueil" })).toBeVisible();
    await expect.element(page.getByRole("img", { name: "Agora" })).toHaveAttribute("width", "24");
    await expect
      .element(page.getByRole("button", { name: "Développer la navigation" }))
      .toHaveAttribute("aria-expanded", "false");
  });

  it("lists Privacy only while the platform collects browser telemetry", async () => {
    const view = await render(ShellStory, { initialModel: model() }, withLocale());
    await expect.element(page.getByRole("link", { name: "Privacy" })).not.toBeInTheDocument();
    await view.unmount();

    render(
      ShellStory,
      { initialModel: model({ activeNavigation: "privacy" }), collectsTelemetry: true },
      withLocale("fr")
    );
    await expect.element(page.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("aria-current", "page");
    await expect.element(page.getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
  });

  it("links the account name directly and keeps logout visible", async () => {
    const shell = controller({
      session: {
        status: "authenticated",
        displayName: "Maya Chen",
        initials: "MC",
      },
    });
    render(
      Screen,
      {
        controller: shell,
      },
      withLocale()
    );

    const accountLink = page.getByRole("link", { name: "Maya Chen" });
    await expect.element(accountLink).toHaveAttribute("href", "/account");
    expect(getComputedStyle(accountLink.element()).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(accountLink.element()).borderTopStyle).toBe("none");
    await expect.element(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect.element(page.getByRole("link", { name: "Log in" })).not.toBeInTheDocument();

    await page.getByRole("button", { name: "Log out" }).click();
    expect(shell.state.model.session.status).toBe("anonymous");
  });

  it.each(["anonymous", "authenticated"] as const)(
    "preserves %s navigation surfaces and control styles across desktop and mobile",
    async (status) => {
      const presentations = [];
      for (const width of [1280, 390, 320]) {
        await page.viewport(width, 844);
        const view = await render(
          Screen,
          {
            controller: controller({
              drawerOpen: width < 768,
              session: status === "authenticated" ? { status, displayName: "Maya Chen", initials: "MC" } : { status },
            }),
          },
          withLocale()
        );
        const surface = page.getByRole(width < 768 ? "dialog" : "complementary", { name: /Agora/ });
        await expect.element(surface).toBeVisible();
        await surface.getByRole("img", { name: "Agora" }).hover();
        const controls = [surface.getByRole("link", { name: "Home" })];
        if (status === "authenticated") controls.push(surface.getByRole("link", { name: "Maya Chen" }));
        controls.push(
          surface.getByRole(status === "authenticated" ? "button" : "link", {
            name: status === "authenticated" ? "Log out" : "Log in",
          })
        );

        const resting = await Promise.all(controls.map((control) => settledStyle(control.element())));
        const hovered = [];
        for (const control of controls) {
          await control.hover();
          hovered.push(await settledStyle(control.element()));
        }
        if (status === "authenticated") {
          expect(hovered[1]?.background).toBe(hovered[2]?.background);
          expect(hovered[1]?.background).not.toBe(resting[1]?.background);
          expect(hovered[1]?.background).not.toBe(getComputedStyle(surface.element()).backgroundColor);
        }
        presentations.push({ background: getComputedStyle(surface.element()).backgroundColor, resting, hovered });
        await view.unmount();
      }
      expect(presentations[1]).toEqual(presentations[0]);
      expect(presentations[2]).toEqual(presentations[0]);
    }
  );

  it.each([320, 390, 767])("keeps mobile branding and controls aligned at %ipx", async (width) => {
    await page.viewport(width, 844);
    render(Screen, { controller: controller({ rail: "collapsed" }) }, withLocale());

    const logo = page.getByRole("img", { name: "Agora" });
    await expect.element(logo).toHaveAttribute("width", "96");
    const logoBounds = logo.element().getBoundingClientRect();
    const source = logo.element().getAttribute("src");
    const open = page.getByRole("link", { name: "Open navigation" });
    const controlBounds = open.element().getBoundingClientRect();
    expect(logoBounds.left).toBeGreaterThanOrEqual(16);
    expect(controlBounds.left).toBeGreaterThan(logoBounds.right);
    expect(
      Math.abs(logoBounds.top + logoBounds.height / 2 - controlBounds.top - controlBounds.height / 2)
    ).toBeLessThanOrEqual(1);

    await open.click();
    const menu = page.getByRole("dialog", { name: "Agora" });
    const menuLogo = menu.getByRole("img", { name: "Agora" });
    await expect.element(menuLogo).toHaveAttribute("src", source);
    const menuLogoBounds = menuLogo.element().getBoundingClientRect();
    const closeBounds = menu.getByRole("link", { name: "Close navigation" }).element().getBoundingClientRect();
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(menuLogoBounds[key]).toBeCloseTo(logoBounds[key], 0);
      expect(closeBounds[key]).toBeCloseTo(controlBounds[key], 0);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  });

  it("aligns mobile drawer labels and contains a long account name", async () => {
    await page.viewport(390, 844);
    const displayName = "Alexandrine de la Bibliothèque des Mondes Imaginaires";
    render(
      Screen,
      {
        controller: controller({
          drawerOpen: true,
          session: {
            status: "authenticated",
            displayName,
            initials: "AB",
          },
        }),
      },
      withLocale()
    );

    const navigation = page.getByRole("dialog", { name: "Agora" });
    await expect.element(navigation).toBeVisible();

    const accountName = navigation.getByText(displayName).element();
    const labelStarts = [
      navigation.getByText("Home").element().getBoundingClientRect().left,
      accountName.getBoundingClientRect().left,
      navigation.getByText("Log out").element().getBoundingClientRect().left,
    ];

    expect(Math.max(...labelStarts) - Math.min(...labelStarts)).toBeLessThanOrEqual(1);
    expect(accountName.scrollWidth).toBeGreaterThan(accountName.clientWidth);
  });

  it.each([320, 390, 768, 1280])("aligns the dialog heading, close control and form at %ipx", async (width) => {
    await page.viewport(width, 568);
    const { t } = createI18n("fr");
    render(Screen, { controller: controller({ authView: "login" }) }, withLocale("fr"));

    const dialog = page.getByRole("dialog");
    await expect.element(dialog).toBeVisible();
    const heading = dialog.getByRole("heading").element().getBoundingClientRect();
    const close = dialog
      .getByRole("link", { name: t("shell.closeAuthentication") })
      .element()
      .getBoundingClientRect();
    const submit = dialog.getByRole("button", { name: t("shell.signIn"), exact: true }).element() as HTMLButtonElement;
    if (!submit.form) throw new Error("Submit button must belong to a form");
    const form = submit.form.getBoundingClientRect();
    const outer = dialog.element().getBoundingClientRect();

    if (width < 768) expect(outer.left).toBe(8);
    expect(form.left - outer.left).toBe(width < 768 ? 16 : 20);
    expect(outer.right - form.right).toBe(width < 768 ? 16 : 20);
    expect(heading.left).toBeCloseTo(form.left);
    expect(close.top + close.height / 2).toBeCloseTo(heading.top + heading.height / 2);
    expect(close.right).toBeCloseTo(form.right);
    expect(dialog.element().scrollWidth).toBeLessThanOrEqual(dialog.element().clientWidth);
  });

  it("keeps a review dialog open when its controller rejects dismissal", async () => {
    const shell = controller({ authView: "login" });
    shell.authenticationDialog.close = () => {};
    render(Screen, { controller: shell }, withLocale());

    await page.getByRole("link", { name: "Close dialog" }).click();

    expect(shell.state.model.authView).toBe("login");
    await expect.element(page.getByRole("dialog", { name: "Log in" })).toBeVisible();
  });

  it("presents session errors as a compact status without a retry action", async () => {
    render(
      Screen,
      {
        controller: controller({
          session: { status: "error" },
        }),
      },
      withLocale()
    );

    await expect.element(page.getByRole("alert")).toMatchTextContent("Account details are unavailable.");
    await expect.element(page.getByRole("button", { name: /Retry account status/i })).not.toBeInTheDocument();
  });

  it.each(sessionFeedback)("uses the shared section message for %s px %s feedback", async (width, status) => {
    await page.viewport(width, 800);
    render(Screen, { controller: controller({ session: { status }, drawerOpen: width < 1280 }) }, withLocale());
    const role = status === "error" ? "alert" : "status";
    const message = page.getByRole(role);
    await expect.element(message).toBeVisible();
    const actual = getComputedStyle(message.element());
    render(Alert, { tone: status, title: "Reference", "aria-label": "Reference" });
    const reference = getComputedStyle(page.getByRole(role, { name: "Reference" }).element());

    for (const property of ["background-color", "border-width", "padding", "border-radius", "gap"]) {
      expect(actual.getPropertyValue(property)).toBe(reference.getPropertyValue(property));
    }
  });

  it.each(["loading", "error"] as const)("keeps collapsed %s feedback named without a custom box", async (status) => {
    render(Screen, { controller: controller({ session: { status }, rail: "collapsed" }) }, withLocale());
    const message = page.getByRole(status === "error" ? "alert" : "status", {
      name: status === "error" ? "Account details are unavailable." : "Loading account",
    });
    await expect.element(message).toBeVisible();
    const wrapper = message.element().parentElement;
    if (!wrapper) throw new Error("Missing compact feedback layout");
    expect(getComputedStyle(wrapper).borderWidth).toBe("0px");
    expect(getComputedStyle(wrapper).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });
});
