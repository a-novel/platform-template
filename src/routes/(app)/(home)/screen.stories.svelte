<script module lang="ts">
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";

  import Screen from "./screen.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, within } from "storybook/test";

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

  async function verifyTitle({ canvasElement, globals }: Pick<StoryContext, "canvasElement" | "globals">) {
    const t = createStorybookTranslator(globals);
    await expect(within(canvasElement).getByRole("heading", { name: t("shell.homeTitle") })).toBeInTheDocument();
  }
</script>

<Story name="Default on desktop" exportName="DefaultDesktop" globals={reviewStoryGlobals.desktop} play={verifyTitle} />

<Story name="Default on mobile" exportName="DefaultMobile" globals={reviewStoryGlobals.mobile} />
