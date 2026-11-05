<script lang="ts">
  import { getPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import { hasTelemetryPreference } from "#lib/ui/telemetry-preference.js";
  import { PUBLIC_PLATFORM_DOMAIN } from "$app/env/public";
  import { afterNavigate, goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  import { createShellController } from "./controller.svelte";
  import { withNavigationOpen } from "./navigation-state";
  import Screen from "./screen.svelte";

  import { onMount } from "svelte";

  import { saveNavigationRail } from "@a-novel-kit/nodelib-browser/preferences";
  import { AuthorizationProvider } from "@a-novel-kit/uikit";
  import { createAuthorizationController } from "@a-novel-kit/uikit/authorization";

  let { children, data } = $props();
  const authorization = createAuthorizationController({
    getStatus: () => page.data.authorization ?? data.authorization,
  });

  let currentHref = $state(page.url.href);
  const controller = createShellController({
    getData: () => data,
    homeHref: resolve(""),
    // Only a platform that collects browser telemetry asks for consent, so only it offers to change the answer.
    privacyHref: hasTelemetryPreference() ? resolve("privacy") : null,
    logoutAction: resolve("auth/logout"),
    platformDowntime: getPlatformDowntime(),
    getUrl: () => new URL(currentHref),
    onDrawerChange: (open) => showShallow(withNavigationOpen(new URL(window.location.href), open)),
    // Every Agora app under the shared domain opens with the rail the visitor left.
    onRailChange: (rail) => saveNavigationRail(rail, { domain: PUBLIC_PLATFORM_DOMAIN }),
  });

  afterNavigate(async ({ complete, shallow }) => {
    if (shallow) return;

    // History updates require the router to finish initial hydration.
    await complete;
    synchronizeUrl();
  });

  onMount(() => {
    window.addEventListener("popstate", synchronizeUrl);

    return () => window.removeEventListener("popstate", synchronizeUrl);
  });

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
