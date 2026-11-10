<script lang="ts">
  import { createTelemetryPreference } from "#lib/client/telemetry-preference.svelte.js";
  import { telemetry } from "#lib/client/telemetry.js";
  import I18nProvider from "#lib/i18n/I18nProvider.svelte";
  import TelemetryConsent from "#lib/ui/TelemetryConsent.svelte";
  import { createPlatformDowntime, setPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import "#lib/ui/lamp.css";
  import { setTelemetryPreference } from "#lib/ui/telemetry-preference.js";
  import { afterNavigate, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";

  import { onMount } from "svelte";

  import lightFavicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon-light.png?no-inline";
  // Each icon follows the browser theme; the app itself stays dark. Firefox ignores `media` and
  // shows the last icon, so the light one comes last. The icons stay files rather than inline data:
  // a password manager's icon service downloads them from these links, and cannot read a data URL.
  import darkFavicon from "@a-novel-kit/ui-images/files/icon/32x32/agora-icon.png?no-inline";
  // Opaque and large, for a phone's home screen and a password manager's list.
  import touchIcon from "@a-novel-kit/ui-images/files/icon/192x192/agora-icon-black.png?no-inline";
  import type { ConsentController } from "@a-novel-kit/uikit";
  import "@a-novel-kit/uikit-fonts/fonts.css";
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

<style>
  /* The root keeps the canvas color contrast checks read, and the lamp hangs on a layer fixed behind
     the page: iOS ignores a fixed background and would scroll the lamp away. The layer asks for a
     compositing layer of its own, without which iOS drops it from the screen once the page scrolls far. */
  :global(html) {
    background: var(--color-surface-canvas);
    /* WCAG 1.4.10 reflows content down to 320 CSS pixels; a narrower window scrolls instead. */
    min-inline-size: 20rem;
    color-scheme: dark;
  }

  :global(body)::before {
    position: fixed;
    z-index: -1;
    will-change: transform;
    inset: 0;
    background: var(--gradient-lamp);
    pointer-events: none;
    content: "";
  }

  /* iOS links an email address or a date it finds in the text, underlined: the text reads as it does on
     a desktop. */
  :global(a[x-apple-data-detectors]) {
    color: inherit;
    text-decoration: none;
  }

  :global(body) {
    margin: 0;
    min-block-size: 100dvb;
    font-family: var(--font-family-interface);
  }
</style>
