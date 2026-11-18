import { withLocale } from "#lib/i18n/provider.fixture.js";

import { type ShellControllerOptions, type ShellViewModel, createShellController } from "./controller.svelte";
import { withNavigationOpen } from "./navigation-state";
import Screen from "./screen.svelte";

import { beforeEach, describe, expect, it, onTestFinished } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import "@a-novel-kit/uikit-fonts/fonts.css";
import "@a-novel-kit/uikit-tokens/tokens.css";

const accountLinks = {
  accountHref: "https://account.example.test/account",
  invitationHref: "https://account.example.test/account?auth=register",
};

function model(patch: Partial<ShellViewModel> = {}): ShellViewModel {
  return {
    activeNavigation: "home",
    drawerOpen: false,
    rail: "expanded",
    session: { status: "anonymous" },
    ...patch,
  };
}

function controller(patch: Partial<ShellViewModel> = {}, options: Partial<ShellControllerOptions> = {}) {
  const { drawerOpen, ...data } = model(patch);
  const url = withNavigationOpen(new URL("https://template.example.test/"), drawerOpen);
  const shell = createShellController({
    getData: () => ({ ...data, ...accountLinks }),
    getUrl: () => url,
    homeHref: "/",
    privacyHref: null,
    logoutAction: "/auth/logout",
    ...options,
  });
  return shell;
}

/**
 * Records the action of each form the screen lets the browser submit, and keeps the submission from leaving
 * the test page.
 */
function blockSubmissions(): string[] {
  const actions: string[] = [];
  const block = (event: SubmitEvent) => {
    if (!event.defaultPrevented && event.target instanceof HTMLFormElement) actions.push(event.target.action);
    event.preventDefault();
  };
  window.addEventListener("submit", block);
  onTestFinished(() => window.removeEventListener("submit", block));
  return actions;
}

/** Reads the color painted behind an element: its own, or else its nearest ancestor's, as the shell's surface. */
function paintedBackground(element: Element | null): string {
  for (; element; element = element.parentElement) {
    const color = getComputedStyle(element).backgroundColor;
    if (color !== "rgba(0, 0, 0, 0)") return color;
  }
  return "rgba(0, 0, 0, 0)";
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

describe("shell screen", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it("lets the browser submit the logout form", async () => {
    render(
      Screen,
      { controller: controller({ session: { status: "authenticated", displayName: "Maya Chen" } }) },
      withLocale()
    );

    const submitted = blockSubmissions();
    await page.getByRole("button", { name: "Log out" }).click();
    expect(submitted).toEqual([new URL("/auth/logout", location.href).href]);
  });

  it("collapses the rail and expands it again", async () => {
    render(Screen, { controller: controller() }, withLocale());

    await page.getByRole("button", { name: "Collapse navigation" }).click();
    const expand = page.getByRole("button", { name: "Expand navigation" });
    await expect.element(expand).toBeVisible();

    await expand.click();
    await expect.element(page.getByRole("button", { name: "Collapse navigation" })).toBeVisible();
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
        if (status === "authenticated") {
          controls.push(surface.getByRole("link", { name: "Maya Chen" }));
          controls.push(surface.getByRole("button", { name: "Log out" }));
        } else {
          controls.push(surface.getByRole("link", { name: "Log in" }));
          controls.push(surface.getByRole("link", { name: "Register" }));
        }

        const resting = await Promise.all(controls.map((control) => settledStyle(control.element())));
        const hovered = [];
        for (const control of controls) {
          await control.hover();
          hovered.push(await settledStyle(control.element()));
        }
        expect(hovered[1]?.background).toBe(hovered[2]?.background);
        expect(hovered[1]?.background).not.toBe(resting[1]?.background);
        const background = paintedBackground(surface.element());
        expect(hovered[1]?.background).not.toBe(background);
        presentations.push({ background, resting, hovered });
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
    expect(logoBounds.left).toBeGreaterThanOrEqual(12);
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

    await menu.getByRole("link", { name: "Close navigation" }).click();
    await expect.element(menu).not.toBeInTheDocument();
  });

  it("closes the menu it opened once the URL closes it, as Back does", async () => {
    await page.viewport(390, 844);
    let href = $state("https://template.example.test/?document=42");
    const shell = controller(
      {},
      {
        getUrl: () => new URL(href),
        onDrawerChange: (open) => (href = withNavigationOpen(new URL(href), open).href),
      }
    );
    render(Screen, { controller: shell }, withLocale());

    await page.getByRole("link", { name: "Open navigation" }).click();
    await expect.element(page.getByRole("dialog", { name: "Agora" })).toBeVisible();
    expect(href).toBe("https://template.example.test/?document=42&menu=open");

    href = "https://template.example.test/?document=42";
    await expect.element(page.getByRole("dialog", { name: "Agora" })).not.toBeInTheDocument();
    expect(shell.state.model.drawerOpen).toBe(false);
  });
});
