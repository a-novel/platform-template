<script module lang="ts">
  import Screen from "./screen.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Authentication/Sign-in failed",
    component: Screen,
    tags: ["!autodocs"],
    parameters: { layout: "fullscreen" },
    args: { failure: "rejected", retryHref: "/auth/sign-in?returnTo=%2Fprivacy" },
  });
</script>

<Story name="Rejected, desktop" exportName="RejectedDesktop" globals={reviewStoryGlobals.desktop} />
<Story name="Rejected, mobile" exportName="RejectedMobile" globals={reviewStoryGlobals.mobile} />
<Story name="Unavailable" args={{ failure: "unavailable" }} />
<Story name="Rate limited" args={{ failure: "rate-limited" }} />
