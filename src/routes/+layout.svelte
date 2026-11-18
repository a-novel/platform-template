<script lang="ts">
  import { telemetry } from "#lib/client/telemetry.js";
  import I18nProvider from "#lib/i18n/I18nProvider.svelte";
  import TelemetryConsent from "#lib/ui/TelemetryConsent.svelte";
  import "#lib/ui/lamp.css";
  import { afterNavigate, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";

  import { onMount } from "svelte";

  import {
    createPlatformDowntime,
    createTelemetryPreference,
    setPlatformDowntime,
    setTelemetryPreference,
  } from "@a-novel-kit/nodelib-svelte";
  import lightFavicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon-light.png?no-inline";
  // Each icon follows the browser theme; the app itself stays dark. Firefox ignores `media` and
  // shows the last icon, so the light one comes last. The icons stay files rather than inline data:
  // a password manager's icon service downloads them from these links, and cannot read a data URL.
  import darkFavicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon.png?no-inline";
  // Opaque and large, for a phone's home screen and a password manager's list.
  import touchIcon from "@a-novel-kit/ui-images/files/icon/192x192/agora-icon-black.png?no-inline";
  import type { ConsentController } from "@a-novel-kit/uikit";
  import "@a-novel-kit/uikit-fonts/fonts.css";
  import "@a-novel-kit/uikit-tokens/canvas.css";
  import "@a-novel-kit/uikit-tokens/tokens.css";

  let { children, data } = $props();

  // The shell places the banner where it leaves its navigation in place, so the root layout only
  // shares the downtime.
  // A page left open as a downtime starts loads again, so it shows what a new visit would and offers no action
  // the downtime stops.
  setPlatformDowntime(createPlatformDowntime(() => data, invalidateAll));

  const preference = createTelemetryPreference(telemetry, () => data.telemetryChoice);
  if (telemetry.enabled) setTelemetryPreference(preference);

  // Only the running page records an answer, so the request waits for it. Without JavaScript, nothing
  // reports and nothing asks.
  let running = $state(false);
  onMount(() => (running = true));

  // The request shows only while the visitor has no answer; the Privacy page changes it later.
  const consent: ConsentController = {
    get state() {
      return { open: telemetry.enabled && running && preference.choice === undefined };
    },
    open: () => {},
    accept: () => preference.choose("accepted"),
    decline: () => preference.choose("declined"),
  };

  // SvelteKit gives the first navigation no route, so the page state names it.
  afterNavigate(() => telemetry.arrive(page.route.id));
</script>

<svelte:head>
  <link rel="icon" type="image/png" href={darkFavicon} media="(prefers-color-scheme: dark)" />
  <link rel="icon" type="image/png" href={lightFavicon} media="(prefers-color-scheme: light)" />
  <link rel="apple-touch-icon" href={touchIcon} />
</svelte:head>

<I18nProvider locale={data.locale}>
  <!-- First in the reading order, so keyboard and screen reader users meet the request first. -->
  <TelemetryConsent controller={consent} />
  {@render children()}
</I18nProvider>
