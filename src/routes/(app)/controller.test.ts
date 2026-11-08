import { type ShellControllerOptions, type ShellData, createShellController } from "./controller.svelte";

import { describe, expect, it, vi } from "vitest";

const accountLinks = {
  accountHref: "https://account.example.test/account",
  invitationHref: "https://account.example.test/account?auth=register",
};

const links = {
  homeHref: "/",
  privacyHref: "/privacy",
  logoutAction: "/logout",
};

function shell(options: Partial<ShellControllerOptions> = {}) {
  return createShellController({
    getData: () => ({ activeNavigation: "home", rail: "expanded", session: { status: "anonymous" }, ...accountLinks }),
    ...links,
    allowNativeLogout: false,
    ...options,
  });
}

describe("createShellController", () => {
  it("accepts semantic shell transitions", () => {
    const onRailChange = vi.fn();
    const onDrawerChange = vi.fn();
    let data: ShellData = {
      activeNavigation: "home",
      rail: "expanded",
      session: { status: "anonymous" },
      ...accountLinks,
    };
    const controller = shell({ getData: () => data, onRailChange, onDrawerChange });

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
      data = { ...data, session };
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

  it("derives the menu from the URL and the rest of the shell from the load data", () => {
    let data: ShellData = {
      activeNavigation: "home",
      rail: "collapsed",
      session: { status: "anonymous" },
      ...accountLinks,
    };
    let url = new URL("https://template.example.test/?menu=open");
    const controller = shell({ getData: () => data, getUrl: () => url });

    expect(controller.state.model).toEqual({
      activeNavigation: "home",
      rail: "collapsed",
      drawerOpen: true,
      session: { status: "anonymous" },
    });

    data = {
      activeNavigation: null,
      rail: "collapsed",
      session: { status: "authenticated" },
      accountHref: null,
      invitationHref: null,
    };
    url = new URL("https://template.example.test/privacy");
    expect(controller.state).toEqual({
      model: { activeNavigation: null, rail: "collapsed", drawerOpen: false, session: { status: "authenticated" } },
      ...links,
      accountHref: null,
      invitationHref: null,
      platformDowntime: undefined,
    });

    expect(controller.logout()).toBe(false);
    expect(controller.state.model.session.status).toBe("anonymous");
  });

  it("allows native logout without replacing the authenticated session", () => {
    const controller = shell({
      getData: () => ({
        activeNavigation: "home",
        rail: "expanded",
        session: { status: "authenticated" },
        ...accountLinks,
      }),
      allowNativeLogout: true,
    });

    expect(controller.logout()).toBe(true);
    expect(controller.state.model.session.status).toBe("authenticated");
  });
});
