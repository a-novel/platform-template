import { signInHref } from "#lib/application/auth/navigation.js";
import type { PlatformDowntime } from "#lib/ui/downtime.svelte.js";

import { withNavigationOpen } from "./navigation-state";

import { SvelteURL } from "svelte/reactivity";

import type { OpenController } from "@a-novel-kit/uikit";

/** Session states the shell can render without owning session logic. */
export type ShellSession =
  | { status: "anonymous" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "downtime" }
  | { status: "authenticated"; displayName?: string; initials?: string };

/** Serializable state consumed by the pure application shell. */
export interface ShellViewModel {
  activeNavigation: "home" | "privacy" | null;
  rail: "expanded" | "collapsed";
  drawerOpen: boolean;
  session: ShellSession;
}

/** State rendered by the application shell component. */
export interface ShellControllerState {
  model: ShellViewModel;
  homeHref: string;
  /** The account page on the account platform, absent while the server cannot read where it lives. */
  accountHref: string | null;
  /** The invitation request on the account platform, absent while the server cannot read where it lives. */
  invitationHref: string | null;
  /** The Privacy page, absent on a platform that collects no browser telemetry and so asks nothing. */
  privacyHref: string | null;
  logoutAction: string;
  /** The planned downtime the shell announces, absent where nothing tracks it. */
  platformDowntime?: PlatformDowntime;
}

/** Route-owned state synchronized into the shell after navigation. */
export interface ShellRouteState {
  activeNavigation: ShellViewModel["activeNavigation"];
  session: ShellSession;
  drawerOpen?: boolean;
}

/** Pure state and transitions consumed by the application shell component. */
export interface ShellController {
  readonly state: ShellControllerState;
  readonly navigationDialog: OpenController;
  /** Native navigation destination for the mobile menu. */
  navigationHref(open: boolean): string;
  /**
   * Starts a sign-in through the account platform that returns to the current page, or to the page a
   * `returnTo` parameter names.
   */
  signInHref(): string;
  /** Switches between the expanded and collapsed navigation rail. */
  toggleRail(): void;
  /** Requests logout and reports whether native form submission should continue. */
  logout(): boolean;
  /** Reconciles route-owned state after navigation. */
  synchronizeRoute(state: ShellRouteState): void;
  /** Reconciles the persisted navigation-rail preference. */
  synchronizeRail(rail: ShellViewModel["rail"]): void;
}

/** Configuration for the default shell controller. */
export interface ShellControllerOptions extends ShellControllerState {
  /** Allows the browser to submit the logout form after the controller accepts it. */
  allowNativeLogout?: boolean;
  /** Observes accepted navigation-rail changes. */
  onRailChange?: (rail: ShellViewModel["rail"]) => void;
  /** Current base-resolved route, including query and fragment state. */
  getUrl?: () => URL;
  /** Observes accepted mobile-menu changes. */
  onDrawerChange?: (open: boolean) => void;
}

/** Creates a reactive controller for the application shell. */
export function createShellController({
  model: initialModel,
  homeHref,
  accountHref,
  invitationHref,
  privacyHref,
  logoutAction,
  platformDowntime,
  allowNativeLogout = true,
  onRailChange,
  getUrl = () => new SvelteURL(homeHref, "https://template.invalid"),
  onDrawerChange,
}: ShellControllerOptions): ShellController {
  let model = $state(initialModel);

  function setDrawerOpen(open: boolean) {
    if (model.drawerOpen === open) return;
    model = { ...model, drawerOpen: open };
    onDrawerChange?.(open);
  }

  function href(url: URL) {
    return url.pathname + url.search + url.hash;
  }

  const navigationDialog: OpenController = {
    get state() {
      return { open: model.drawerOpen };
    },
    open: () => setDrawerOpen(true),
    close: () => setDrawerOpen(false),
    toggle: () => setDrawerOpen(!model.drawerOpen),
  };

  return {
    get state() {
      return { model, homeHref, accountHref, invitationHref, privacyHref, logoutAction, platformDowntime };
    },
    navigationDialog,
    navigationHref: (open) => href(withNavigationOpen(getUrl(), open)),
    signInHref() {
      const url = withNavigationOpen(getUrl(), false);
      return signInHref(url.searchParams.get("returnTo") ?? href(url));
    },
    toggleRail() {
      const rail = model.rail === "expanded" ? "collapsed" : "expanded";
      model = { ...model, rail };
      onRailChange?.(rail);
    },
    logout() {
      if (model.session.status !== "authenticated") return false;
      if (!allowNativeLogout) model = { ...model, session: { status: "anonymous" } };
      return allowNativeLogout;
    },
    synchronizeRoute(routeState) {
      model = {
        ...model,
        activeNavigation: routeState.activeNavigation,
        session: routeState.session,
        drawerOpen: routeState.drawerOpen ?? model.drawerOpen,
      };
    },
    synchronizeRail(rail) {
      if (model.rail !== rail) model = { ...model, rail };
    },
  };
}
