<script module lang="ts">
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";

  import PrivacyStory from "./story.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, userEvent, within } from "storybook/test";

  const { Story } = defineMeta({
    title: "Shell/Privacy",
    component: PrivacyStory,
    parameters: {
      layout: "fullscreen",
      docs: {
        description: {
          component:
            "Where a visitor changes the telemetry answer this device gave the consent banner. Every platform keeps one, because the answer lives on the device, per site.",
        },
      },
    },
  });

  async function verifyWithdrawal({ canvasElement, globals }: Pick<StoryContext, "canvasElement" | "globals">) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const setting = canvas.getByRole("switch");
    await expect(setting).toBeChecked();
    await userEvent.click(canvas.getByText(t("telemetryConsent.title")));
    await expect(setting).not.toBeChecked();
  }
</script>

<Story
  name="Accepted — desktop"
  exportName="AcceptedDesktop"
  args={{ telemetryChoice: "accepted" }}
  globals={reviewStoryGlobals.desktop}
  play={verifyWithdrawal}
/>

<Story
  name="Accepted — mobile"
  exportName="AcceptedMobile"
  args={{ telemetryChoice: "accepted" }}
  globals={reviewStoryGlobals.mobile}
/>

<Story name="Declined" args={{ telemetryChoice: "declined" }} />

<Story name="Not collecting" exportName="NotCollecting" args={{ collects: false }} />
