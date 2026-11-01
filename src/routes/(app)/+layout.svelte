<script lang="ts">
  import { readAuthenticationActionModel } from "#lib/application/auth/action-data.js";
  import {
    normalizeAuthUrl,
    readAuthView,
    readNavigationOpen,
    withAuthView,
    withNavigationOpen,
  } from "#lib/application/shell/auth-dialog-state.js";
  import type { AuthDialogView } from "#lib/application/shell/types.js";
  import { readRailCollapsed, writeRailCollapsed } from "#lib/client/shell/rail-preference.js";
  import { authenticationPageTitle } from "#lib/i18n/page-titles.js";
  import { authenticationTitleContext } from "#lib/ui/PageTitle.svelte";
  import { afterNavigate, goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  import {
    type AuthenticationPanelControllerState,
    createAuthenticationPanelController,
  } from "./(authentication)/controller.svelte";
  import { createShellController, readyAuthenticationModel } from "./controller.svelte";
  import Screen from "./screen.svelte";

  import { onMount, setContext, untrack } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { AuthorizationProvider } from "@a-novel-kit/uikit";
  import { createAuthorizationController } from "@a-novel-kit/uikit/authorization";

  let { children, data } = $props();
  const { t } = getI18nContext();
  const authorization = createAuthorizationController({
    getStatus: () => page.data.authorization ?? data.authorization,
  });

  let currentHref = $state(page.url.href);
  const initialRoute = untrack(routeState);
  const authentication = createAuthenticationPanelController(
    initialRoute.authentication ?? authenticationState("login")
  );
  const controller = createShellController({
    model: {
      activeNavigation: initialRoute.activeNavigation,
      authView: initialRoute.authView,
      drawerOpen: initialRoute.drawerOpen,
      rail: "expanded",
      session: initialRoute.session,
    },
    homeHref: resolve(""),
    accountHref: resolve("account"),
    privacyHref: resolve("privacy"),
    logoutAction: resolve("auth/logout"),
    authentication,
    resolveAuthentication: authenticationState,
    onAuthViewChange: changeAuthView,
    getUrl: () => new URL(currentHref),
    onDrawerChange: (open) => showShallow(withNavigationOpen(new URL(window.location.href), open)),
    onRailChange: (rail) => writeRailCollapsed(window.localStorage, rail === "collapsed"),
  });

  setContext(authenticationTitleContext, () =>
    !page.error && controller.state.model.authView
      ? authenticationPageTitle(t, controller.authentication.state.model)
      : undefined
  );

  $effect(() => {
    const route = routeState();
    untrack(() => controller.synchronizeRoute(route));
  });

  afterNavigate(async ({ complete, shallow }) => {
    if (shallow) return;

    // History updates require the router to finish initial hydration.
    await complete;
    synchronizeUrl();
  });

  onMount(() => {
    controller.synchronizeRail(readRailCollapsed(window.localStorage) ? "collapsed" : "expanded");

    window.addEventListener("popstate", synchronizeUrl);

    return () => window.removeEventListener("popstate", synchronizeUrl);
  });

  /** The shell state that the route data and the current URL hold. */
  function routeState() {
    const parameters = new URL(currentHref).searchParams;
    const authView = readAuthView(parameters);

    return {
      activeNavigation: data.activeNavigation,
      session: data.session,
      authView,
      drawerOpen: readNavigationOpen(parameters),
      authentication: authView ? authenticationState(authView) : undefined,
    };
  }

  /** Shows a URL change without loading the page, and makes it the shell's current URL. */
  function showShallow(next: URL, replace = true) {
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- Shallow routing edits the current, resolved URL.
    goto(next, { shallow: true, replace, state: page.state });
    currentHref = next.href;
  }

  function synchronizeUrl() {
    const normalized = normalizeAuthUrl(new URL(window.location.href));
    if (normalized.href !== window.location.href) showShallow(normalized);
    else currentHref = normalized.href;
  }

  /** The authentication form of a view: the latest action result for it, or a blank form. */
  function authenticationState(view: AuthDialogView): AuthenticationPanelControllerState {
    return {
      model: readAuthenticationActionModel(page.form, view) ?? readyAuthenticationModel(view),
      action: authenticationAction(view),
    };
  }

  function authenticationAction(view: AuthDialogView): string {
    const current = new URL(currentHref);
    const target = new URL(resolve(""), current);
    target.searchParams.set("auth", view);

    const returnTo = current.searchParams.get("returnTo");
    if (returnTo) target.searchParams.set("returnTo", returnTo);

    return target.pathname + target.search;
  }

  function changeAuthView(view: AuthDialogView | null) {
    const previousView = readAuthView(new URL(window.location.href).searchParams);
    // Opening the dialog adds a history entry. Any other change replaces the current one.
    showShallow(withAuthView(new URL(window.location.href), view), previousView !== null || view === null);
  }
</script>

<AuthorizationProvider controller={authorization}>
  <Screen {controller}>
    {@render children()}
  </Screen>
</AuthorizationProvider>
