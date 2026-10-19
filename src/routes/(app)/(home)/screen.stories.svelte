<script module lang="ts">
  import Screen from "./screen.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Shell/Empty home",
    component: Screen,
    parameters: {
      layout: "fullscreen",
      docs: {
        description: {
          component:
            "The empty home page. Its title stays available to assistive technology while the canvas stays clear.",
        },
      },
    },
  });
</script>

<Story name="Default — desktop" exportName="DefaultDesktop" globals={reviewStoryGlobals.desktop} />

<Story name="Default — mobile" exportName="DefaultMobile" globals={reviewStoryGlobals.mobile} />
