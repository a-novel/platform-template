<script lang="ts">
  import { telemetry } from "#lib/client/telemetry.js";
  import I18nProvider from "#lib/i18n/I18nProvider.svelte";
  import TelemetryConsent from "#lib/ui/TelemetryConsent.svelte";
  import { createPlatformDowntime, setPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import { setTelemetryConsent } from "#lib/ui/telemetry-consent.js";
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";

  import { onMount } from "svelte";

  // The opaque tile keeps the logo readable on light and dark tab bars alike.
  import favicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon-black.png";
  import { createConsentController } from "@a-novel-kit/uikit";
  import "@a-novel-kit/uikit-fonts/fonts.css";
  import "@a-novel-kit/uikit-tokens/tokens.css";

  let { children, data } = $props();

  // The shell places the banner where it leaves its navigation in place, so the root layout only
  // shares the downtime.
  setPlatformDowntime(createPlatformDowntime(() => data));

  const consent = createConsentController({ onChoice: (choice) => void telemetry.choose(choice) });
  if (telemetry.enabled) setTelemetryConsent(consent);

  // The answer lives on the visitor's device, so the request opens only once the page runs there.
  onMount(() => {
    if (telemetry.enabled && telemetry.choice === undefined) consent.open();
  });

  beforeNavigate((navigation) => telemetry.navigate(navigation));
  // SvelteKit gives the first navigation no route, so the page state names it.
  afterNavigate(() => telemetry.arrive(page.route.id));
</script>

<svelte:head>
  <link rel="icon" type="image/png" href={favicon} />
</svelte:head>

<I18nProvider locale={data.locale}>
  <!-- First in the reading order, so keyboard and screen reader users meet the request first. -->
  <TelemetryConsent controller={consent} />
  {@render children()}
</I18nProvider>

<style>
  :global(html) {
    background: var(--color-surface-canvas);
    min-inline-size: 20rem;
    color-scheme: dark;
  }

  :global(body) {
    margin: 0;
    min-block-size: 100dvb;
    font-family: var(--font-family-interface);
  }
</style>
