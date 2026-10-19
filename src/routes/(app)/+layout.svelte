<script lang="ts">
  import { readAuthenticationActionModel } from "#lib/application/auth/action-data.js";
  import type { AuthenticationPanelModel } from "#lib/application/auth/types.js";
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

  import { createAuthenticationPanelController } from "./(authentication)/controller.svelte";
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
  const initialRoute = untrack(() => ({
    href: currentHref,
    activeNavigation: data.activeNavigation === "home" ? ("home" as const) : null,
    session: data.session,
  }));
  const initialAuthView = readAuthView(new URL(initialRoute.href).searchParams);
  const authentication = createAuthenticationPanelController({
    model: authenticationModel(initialAuthView ?? "login"),
    action: authenticationAction(initialAuthView ?? "login"),
  });
  const controller = createShellController({
    model: {
      activeNavigation: initialRoute.activeNavigation,
      authView: initialAuthView,
      drawerOpen: readNavigationOpen(new URL(initialRoute.href).searchParams),
      rail: "expanded",
      session: initialRoute.session,
    },
    homeHref: resolve(""),
    accountHref: resolve("account"),
    logoutAction: resolve("auth/logout"),
    authentication,
    resolveAuthentication: (view) => ({
      model: authenticationModel(view),
      action: authenticationAction(view),
    }),
    onAuthViewChange: changeAuthView,
    getUrl: () => new URL(currentHref),
    onDrawerChange: (open) => {
      const next = withNavigationOpen(new URL(window.location.href), open);
      // eslint-disable-next-line svelte/no-navigation-without-resolve -- Shallow routing edits the current, resolved URL.
      goto(next, { shallow: true, replace: true, state: page.state });
      currentHref = next.href;
    },
    onRailChange: (rail) => writeRailCollapsed(window.localStorage, rail === "collapsed"),
  });

  setContext(authenticationTitleContext, () =>
    !page.error && controller.state.model.authView
      ? authenticationPageTitle(t, controller.authentication.state.model)
      : undefined
  );

  $effect(() => {
    const authView = readAuthView(new URL(currentHref).searchParams);
    const activeNavigation = data.activeNavigation === "home" ? "home" : null;
    const session = data.session;
    const routeAuthentication = authView
      ? { model: authenticationModel(authView), action: authenticationAction(authView) }
      : undefined;

    untrack(() =>
      controller.synchronizeRoute({
        activeNavigation,
        session,
        authView,
        drawerOpen: readNavigationOpen(new URL(currentHref).searchParams),
        authentication: routeAuthentication,
      })
    );
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

  function synchronizeUrl() {
    const normalized = normalizeAuthUrl(new URL(window.location.href));
    if (normalized.href !== window.location.href) {
      // eslint-disable-next-line svelte/no-navigation-without-resolve -- Shallow routing edits the current, resolved URL.
      goto(normalized, { shallow: true, replace: true, state: page.state });
    }
    currentHref = normalized.href;
  }

  function authenticationModel(view: AuthDialogView): AuthenticationPanelModel {
    return readAuthenticationActionModel(page.form, view) ?? readyAuthenticationModel(view);
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
    const next = withAuthView(new URL(window.location.href), view);
    // Opening the dialog adds a history entry; any other change replaces the current one.
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- Shallow routing edits the current, resolved URL.
    goto(next, { shallow: true, replace: previousView !== null || view === null, state: page.state });
    currentHref = next.href;
  }
</script>

<AuthorizationProvider controller={authorization}>
  <Screen {controller}>
    {@render children()}
  </Screen>
</AuthorizationProvider>
