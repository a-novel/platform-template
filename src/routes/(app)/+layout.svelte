<script lang="ts">
  import { getPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import { hasTelemetryPreference } from "#lib/ui/telemetry-preference.js";
  import { afterNavigate, goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  import { createShellController } from "./controller.svelte";
  import { readNavigationOpen, withNavigationOpen } from "./navigation-state";
  import { readRailCollapsed, writeRailCollapsed } from "./rail-preference";
  import Screen from "./screen.svelte";

  import { onMount, untrack } from "svelte";

  import { AuthorizationProvider } from "@a-novel-kit/uikit";
  import { createAuthorizationController } from "@a-novel-kit/uikit/authorization";

  let { children, data } = $props();
  const authorization = createAuthorizationController({
    getStatus: () => page.data.authorization ?? data.authorization,
  });

  let currentHref = $state(page.url.href);
  const controller = createShellController({
    model: { ...untrack(routeState), rail: "expanded" },
    homeHref: resolve(""),
    // The account platform serves these pages, at addresses no navigation changes.
    accountHref: untrack(() => data.accountHref),
    invitationHref: untrack(() => data.invitationHref),
    // Only a platform that collects browser telemetry asks for consent, so only it offers to change the answer.
    privacyHref: hasTelemetryPreference() ? resolve("privacy") : null,
    logoutAction: resolve("auth/logout"),
    platformDowntime: getPlatformDowntime(),
    getUrl: () => new URL(currentHref),
    onDrawerChange: (open) => showShallow(withNavigationOpen(new URL(window.location.href), open)),
    onRailChange: (rail) => writeRailCollapsed(window.localStorage, rail === "collapsed"),
  });

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
    return {
      activeNavigation: data.activeNavigation,
      session: data.session,
      drawerOpen: readNavigationOpen(new URL(currentHref).searchParams),
    };
  }

  /** Shows a URL change without loading the page, and makes it the shell's current URL. */
  function showShallow(next: URL) {
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- Shallow routing edits the current, resolved URL.
    goto(next, { shallow: true, replace: true, state: page.state });
    currentHref = next.href;
  }

  function synchronizeUrl() {
    currentHref = window.location.href;
  }
</script>

<AuthorizationProvider controller={authorization}>
  <Screen {controller}>
    {@render children()}
  </Screen>
</AuthorizationProvider>
