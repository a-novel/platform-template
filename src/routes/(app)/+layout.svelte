<script lang="ts">
  import { retryWhile } from "#lib/client/retry.svelte.js";
  import { getPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import { hasTelemetryPreference } from "#lib/ui/telemetry-preference.js";
  import { PUBLIC_PLATFORM_DOMAIN } from "$app/env/public";
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  import { createShellController } from "./controller.svelte";
  import { shellSessionData } from "./dependencies";
  import { withNavigationOpen } from "./navigation-state";
  import Screen from "./screen.svelte";

  import { saveNavigationRail } from "@a-novel-kit/nodelib-browser/preferences";
  import { AuthorizationProvider } from "@a-novel-kit/uikit";
  import { createAuthorizationController } from "@a-novel-kit/uikit/authorization";

  let { children, data } = $props();
  const authorization = createAuthorizationController({
    getStatus: () => page.data.authorization ?? data.authorization,
  });

  // A shallow navigation, the shell's or a page's, changes the address bar but not `page.url`.
  const address = $derived(new URL((page.shallow?.url ?? page.url).href));
  const controller = createShellController({
    getData: () => data,
    homeHref: resolve(""),
    // Only a platform that collects browser telemetry asks for consent, so only it offers to change the answer.
    privacyHref: hasTelemetryPreference() ? resolve("privacy") : null,
    logoutAction: resolve("auth/logout"),
    platformDowntime: getPlatformDowntime(),
    getUrl: () => address,
    onDrawerChange: (open) =>
      // eslint-disable-next-line svelte/no-navigation-without-resolve -- Shallow routing edits the current, resolved URL.
      goto(withNavigationOpen(address, open), { shallow: true, replace: true, state: page.state }),
    // Every Agora app under the shared domain opens with the rail the visitor left.
    onRailChange: (rail) => saveNavigationRail(rail, { domain: PUBLIC_PLATFORM_DOMAIN }),
  });

  retryWhile(
    () => data.session.status === "loading",
    () => invalidate(shellSessionData)
  );
</script>

<AuthorizationProvider controller={authorization}>
  <Screen {controller}>
    {@render children()}
  </Screen>
</AuthorizationProvider>
