import { createAuthenticationPanelController } from "./(authentication)/controller.svelte";
import { createShellController, readyAuthenticationModel } from "./controller.svelte";

import { describe, expect, it, vi } from "vitest";

describe("createShellController", () => {
  it("accepts semantic shell transitions", () => {
    const onAuthViewChange = vi.fn();
    const onRailChange = vi.fn();
    const onDrawerChange = vi.fn();
    let url = new URL("https://template.example.test/base/?document=42&menu=open&returnTo=%2Faccount#selection");
    const authentication = createAuthenticationPanelController({
      model: readyAuthenticationModel("login"),
      action: "/auth",
      allowNativeSubmission: false,
    });
    const controller = createShellController({
      model: {
        activeNavigation: "home",
        authView: "login",
        drawerOpen: false,
        rail: "expanded",
        session: { status: "anonymous" },
      },
      homeHref: "/",
      accountHref: "/account",
      logoutAction: "/logout",
      authentication,
      allowNativeLogout: false,
      onAuthViewChange,
      onRailChange,
      onDrawerChange,
      getUrl: () => url,
    });

    expect(controller.authenticationHref("login")).toBe("/base/?document=42&returnTo=%2Faccount&auth=login#selection");
    expect(controller.navigationHref(false)).toBe("/base/?document=42&returnTo=%2Faccount#selection");
    url = new URL("https://template.example.test/base/account?auth=login");
    expect(controller.authenticationHref(null)).toBe("/base/account");

    controller.authenticationDialog.close();
    expect(controller.state.model.authView).toBeNull();
    expect(controller.authenticationDialog.state.open).toBe(false);
    expect(onAuthViewChange).toHaveBeenCalledExactlyOnceWith(null);

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

    controller.authenticationDialog.open();
    controller.authenticationDialog.open();
    expect(controller.authenticationDialog.state.open).toBe(true);
    expect(onAuthViewChange).toHaveBeenCalledTimes(2);
    controller.authenticationDialog.toggle();
    expect(controller.authenticationDialog.state.open).toBe(false);
    controller.authenticationDialog.toggle();
    expect(controller.state.model.authView).toBe("login");
    expect(onAuthViewChange.mock.calls).toEqual([[null], ["login"], [null], ["login"]]);

    for (const session of [{ status: "anonymous" }, { status: "loading" }, { status: "error" }] as const) {
      controller.synchronizeRoute({ activeNavigation: "home", authView: null, session });
      expect(controller.logout()).toBe(false);
      expect(controller.state.model.session).toEqual(session);
    }
  });

  it("synchronizes route state around accepted shell transitions", () => {
    const onAuthViewChange = vi.fn();
    const authentication = createAuthenticationPanelController({
      model: readyAuthenticationModel("login"),
      action: "/auth",
      allowNativeSubmission: false,
    });
    const controller = createShellController({
      model: {
        activeNavigation: "home",
        authView: null,
        drawerOpen: false,
        rail: "expanded",
        session: { status: "anonymous" },
      },
      homeHref: "/",
      accountHref: "/account",
      logoutAction: "/logout",
      authentication,
      resolveAuthentication: (view) => ({
        model: readyAuthenticationModel(view),
        action: `/auth/${view}`,
      }),
      allowNativeLogout: false,
      onAuthViewChange,
    });

    controller.openAuthentication("login");
    expect(controller.state.model.authView).toBe("login");
    expect(controller.authentication.state).toEqual({
      model: { journey: "login", state: { status: "ready" } },
      action: "/auth/login",
    });
    expect(onAuthViewChange).toHaveBeenCalledExactlyOnceWith("login");

    controller.openAuthentication("login");
    controller.authenticationDialog.close();
    expect(onAuthViewChange).toHaveBeenLastCalledWith(null);

    controller.synchronizeRail("collapsed");
    controller.synchronizeRail("collapsed");
    controller.navigationDialog.open();
    expect(controller.state.model.rail).toBe("collapsed");

    controller.synchronizeRoute({
      activeNavigation: null,
      authView: "login",
      session: { status: "authenticated", displayName: "Maya Chen" },
      authentication: {
        model: readyAuthenticationModel("login"),
        action: "/auth/login?returnTo=%2Faccount",
      },
    });
    expect(controller.state.model).toMatchObject({
      activeNavigation: null,
      authView: "login",
      rail: "collapsed",
      drawerOpen: true,
      session: { status: "authenticated", displayName: "Maya Chen" },
    });
    expect(controller.authentication.state.action).toBe("/auth/login?returnTo=%2Faccount");
    expect(onAuthViewChange.mock.calls).toEqual([["login"], [null]]);

    expect(controller.logout()).toBe(false);
    expect(controller.state.model.session.status).toBe("anonymous");
  });

  it("allows native logout without replacing the authenticated session", () => {
    const authentication = createAuthenticationPanelController({
      model: readyAuthenticationModel("login"),
      action: "/auth",
    });
    const controller = createShellController({
      model: {
        activeNavigation: "home",
        authView: null,
        drawerOpen: false,
        rail: "expanded",
        session: { status: "authenticated", displayName: "Maya Chen" },
      },
      homeHref: "/",
      accountHref: "/account",
      logoutAction: "/logout",
      authentication,
    });

    expect(controller.logout()).toBe(true);
    expect(controller.state.model.session.status).toBe("authenticated");
  });
});
