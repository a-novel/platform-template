<script lang="ts">
  import { createTelemetryPreference } from "#lib/client/telemetry-preference.svelte.js";
  import { telemetry } from "#lib/client/telemetry.js";
  import I18nProvider from "#lib/i18n/I18nProvider.svelte";
  import TelemetryConsent from "#lib/ui/TelemetryConsent.svelte";
  import { createPlatformDowntime, setPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import "#lib/ui/lamp.css";
  import { setTelemetryPreference } from "#lib/ui/telemetry-preference.js";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";

  import lightFavicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon-light.png";
  // Each icon follows the browser theme; the app itself stays dark. Firefox ignores `media` and
  // shows the last icon, so the light one comes last.
  import darkFavicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon.png";
  import type { ConsentController } from "@a-novel-kit/uikit";
  import "@a-novel-kit/uikit-fonts/fonts.css";
  import "@a-novel-kit/uikit-tokens/tokens.css";

  let { children, data } = $props();

  // The shell places the banner where it leaves its navigation in place, so the root layout only
  // shares the downtime.
  setPlatformDowntime(createPlatformDowntime(() => data));

  const preference = createTelemetryPreference(telemetry);
  if (telemetry.enabled) setTelemetryPreference(preference);

  // The request shows only while the device records no answer; the Privacy page changes it later.
  const consent: ConsentController = {
    get state() {
      return { open: telemetry.enabled && !preference.pending && preference.choice === undefined };
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
</svelte:head>

<I18nProvider locale={data.locale}>
  <!-- First in the reading order, so keyboard and screen reader users meet the request first. -->
  <TelemetryConsent controller={consent} />
  {@render children()}
</I18nProvider>

<style>
  /* The lamp lives on the root, so pages leave the canvas bare and contrast checks read its color. */
  :global(html) {
    background: var(--fill-canvas);
    /* WCAG 1.4.10 reflows content down to 320 CSS pixels; a narrower window scrolls instead. */
    min-inline-size: 20rem;
    color-scheme: dark;
  }

  :global(body) {
    margin: 0;
    min-block-size: 100dvb;
    font-family: var(--font-family-interface);
  }
</style>
