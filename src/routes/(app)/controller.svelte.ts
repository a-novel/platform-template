import { signInHref } from "#lib/application/auth/navigation.js";
import type { PlatformDowntime } from "#lib/ui/downtime.svelte.js";

import { readNavigationOpen, withNavigationOpen } from "./navigation-state";

import { SvelteURL } from "svelte/reactivity";

import type { OpenController } from "@a-novel-kit/uikit";

/** Session states the shell can render without owning session logic. */
export type ShellSession =
  | { status: "anonymous" }
  /** A session whose account could not be read yet. The shell shows a placeholder and asks again. */
  | { status: "loading" }
  | {
      status: "authenticated";
      displayName?: string;
      initials?: string;
      /** The address of the account's picture, which replaces the initials. */
      picture?: string;
    };

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

/** The layout's load data the shell renders: the page's destination, the session, the rail and the account links. */
export type ShellData = Pick<ShellViewModel, "activeNavigation" | "session" | "rail"> &
  Pick<ShellControllerState, "accountHref" | "invitationHref">;

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
}

/** Configuration for the default shell controller. */
export interface ShellControllerOptions extends Omit<ShellControllerState, "model" | "accountHref" | "invitationHref"> {
  /** The layout's load data, which each navigation may replace. */
  getData: () => ShellData;
  /** Allows the browser to submit the logout form after the controller accepts it. */
  allowNativeLogout?: boolean;
  /** Observes accepted navigation-rail changes. */
  onRailChange?: (rail: ShellViewModel["rail"]) => void;
  /** Current base-resolved route, including query and fragment state. It owns the mobile menu. */
  getUrl?: () => URL;
  /** Observes accepted mobile-menu changes. */
  onDrawerChange?: (open: boolean) => void;
}

/** Creates a reactive controller for the application shell. */
export function createShellController({
  getData,
  homeHref,
  privacyHref,
  logoutAction,
  platformDowntime,
  allowNativeLogout = true,
  onRailChange,
  getUrl = () => new SvelteURL(homeHref, "https://template.invalid"),
  onDrawerChange,
}: ShellControllerOptions): ShellController {
  // The rail the server read from the visitor's cookie, until they toggle it.
  let rail = $derived(getData().rail);
  // The URL owns the menu: a transition opens or closes it at once, and the next URL, such as Back's, decides again.
  let drawerOpen = $derived(readNavigationOpen(getUrl().searchParams));
  // A logout the browser does not submit signs the shell out until the next load.
  let session = $derived(getData().session);

  const state = $derived.by((): ShellControllerState => {
    const { activeNavigation, accountHref, invitationHref } = getData();
    return {
      model: { activeNavigation, rail, drawerOpen, session },
      homeHref,
      accountHref,
      invitationHref,
      privacyHref,
      logoutAction,
      platformDowntime,
    };
  });

  function setDrawerOpen(open: boolean) {
    if (drawerOpen === open) return;
    drawerOpen = open;
    onDrawerChange?.(open);
  }

  function href(url: URL) {
    return url.pathname + url.search + url.hash;
  }

  const navigationDialog: OpenController = {
    get state() {
      return { open: drawerOpen };
    },
    open: () => setDrawerOpen(true),
    close: () => setDrawerOpen(false),
    toggle: () => setDrawerOpen(!drawerOpen),
  };

  return {
    get state() {
      return state;
    },
    navigationDialog,
    navigationHref: (open) => href(withNavigationOpen(getUrl(), open)),
    signInHref() {
      const url = withNavigationOpen(getUrl(), false);
      return signInHref(url.searchParams.get("returnTo") ?? href(url));
    },
    toggleRail() {
      rail = rail === "expanded" ? "collapsed" : "expanded";
      onRailChange?.(rail);
    },
    logout() {
      if (session.status === "anonymous") return false;
      if (!allowNativeLogout) session = { status: "anonymous" };
      return allowNativeLogout;
    },
  };
}
