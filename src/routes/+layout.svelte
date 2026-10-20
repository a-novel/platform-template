<script lang="ts">
  import I18nProvider from "#lib/i18n/I18nProvider.svelte";
  import { createPlatformDowntime, setPlatformDowntime } from "#lib/ui/downtime.svelte.js";

  import "@a-novel-kit/uikit-fonts/fonts.css";
  // The opaque tile keeps the logo readable on light and dark tab bars alike.
  import favicon from "@a-novel-kit/uikit-images/files/icon/32x32/agora-icon-black.png";
  import "@a-novel-kit/uikit-tokens/tokens.css";

  let { children, data } = $props();

  // The shell and standalone pages place the banner where it doesn't push navigation away.
  setPlatformDowntime(createPlatformDowntime(() => data));
</script>

<svelte:head>
  <link rel="icon" type="image/png" href={favicon} />
</svelte:head>

<I18nProvider locale={data.locale}>
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
