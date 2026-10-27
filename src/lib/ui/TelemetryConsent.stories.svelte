<script module lang="ts">
  import TelemetryConsent from "./TelemetryConsent.svelte";

  import type { ConsentController } from "@a-novel-kit/uikit";
  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Shell/Telemetry consent",
    tags: ["!autodocs"],
    parameters: { layout: "fullscreen" },
  });

  // The request as a visitor who has not answered sees it; answers leave it in place for review.
  const ignore = () => {};
  const unanswered: ConsentController = { state: { open: true }, open: ignore, accept: ignore, decline: ignore };
</script>

<Story name="Request — desktop" exportName="RequestDesktop" globals={reviewStoryGlobals.desktop} asChild>
  <div class="page"><TelemetryConsent controller={unanswered} /></div>
</Story>

<Story name="Request — mobile" exportName="RequestMobile" globals={reviewStoryGlobals.mobile} asChild>
  <div class="page"><TelemetryConsent controller={unanswered} /></div>
</Story>

<style>
  .page {
    background: var(--color-surface-canvas);
    min-block-size: 100dvb;
  }
</style>
