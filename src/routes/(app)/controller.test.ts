import { type ShellControllerOptions, createShellController } from "./controller.svelte";

import { describe, expect, it, vi } from "vitest";

const links = {
  homeHref: "/",
  accountHref: "https://account.example.test/account",
  invitationHref: "https://account.example.test/?auth=register",
  privacyHref: "/privacy",
  logoutAction: "/logout",
};

function shell(options: Partial<ShellControllerOptions> = {}) {
  return createShellController({
    model: { activeNavigation: "home", drawerOpen: false, rail: "expanded", session: { status: "anonymous" } },
    ...links,
    allowNativeLogout: false,
    ...options,
  });
}

describe("createShellController", () => {
  it("accepts semantic shell transitions", () => {
    const onRailChange = vi.fn();
    const onDrawerChange = vi.fn();
    const controller = shell({ onRailChange, onDrawerChange });

    controller.navigationDialog.open();
    expect(onDrawerChange).toHaveBeenCalledExactlyOnceWith(true);
    controller.toggleRail();
    expect(controller.state.model).toMatchObject({ drawerOpen: true, rail: "collapsed" });
    expect(controller.navigationDialog.state.open).toBe(true);
    expect(onRailChange).toHaveBeenCalledExactlyOnceWith("collapsed");

    controller.navigationDialog.close();
    expect(controller.state.model.drawerOpen).toBe(false);
    controller.navigationDialog.toggle();
    controller.navigationDialog.open();
    expect(controller.navigationDialog.state.open).toBe(true);
    controller.navigationDialog.toggle();
    expect(controller.navigationDialog.state.open).toBe(false);
    expect(onDrawerChange.mock.calls).toEqual([[true], [false], [true], [false]]);

    for (const session of [{ status: "anonymous" }, { status: "loading" }, { status: "error" }] as const) {
      controller.synchronizeRoute({ activeNavigation: "home", session });
      expect(controller.logout()).toBe(false);
      expect(controller.state.model.session).toEqual(session);
    }
  });

  it("links the menu and a sign-in that returns to the current page without the open menu", () => {
    let url = new URL("https://template.example.test/base/?document=42&menu=open#selection");
    const controller = shell({ getUrl: () => url });

    expect(controller.navigationHref(false)).toBe("/base/?document=42#selection");
    expect(controller.navigationHref(true)).toBe("/base/?document=42&menu=open#selection");
    expect(controller.signInHref()).toBe("/auth/sign-in?returnTo=%2Fbase%2F%3Fdocument%3D42%23selection");

    url = new URL("https://template.example.test/auth/sign-in/failed?returnTo=%2Fprivacy&reason=unavailable");
    expect(controller.signInHref()).toBe("/auth/sign-in?returnTo=%2Fprivacy");
  });

  it("synchronizes route state around accepted shell transitions", () => {
    const controller = shell();

    controller.synchronizeRail("collapsed");
    controller.synchronizeRail("collapsed");
    controller.navigationDialog.open();
    expect(controller.state.model.rail).toBe("collapsed");

    controller.synchronizeRoute({ activeNavigation: null, session: { status: "authenticated" } });
    expect(controller.state.model).toEqual({
      activeNavigation: null,
      rail: "collapsed",
      drawerOpen: true,
      session: { status: "authenticated" },
    });
    expect(controller.state).toMatchObject(links);

    expect(controller.logout()).toBe(false);
    expect(controller.state.model.session.status).toBe("anonymous");
  });

  it("allows native logout without replacing the authenticated session", () => {
    const controller = shell({
      model: { activeNavigation: "home", drawerOpen: false, rail: "expanded", session: { status: "authenticated" } },
      allowNativeLogout: true,
    });

    expect(controller.logout()).toBe(true);
    expect(controller.state.model.session.status).toBe("authenticated");
  });
});
