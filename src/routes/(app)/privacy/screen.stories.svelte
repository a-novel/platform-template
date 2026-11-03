<script module lang="ts">
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";
  import type { TelemetryPreference } from "#lib/ui/telemetry-preference.js";

  import PrivacyScreen from "./screen.svelte";

  import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";
  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, fn, userEvent, within } from "storybook/test";

  /** A fixed answer: choosing reports the request without changing the scenario. */
  function answer(choice: TelemetryChoice | undefined, pending = false): TelemetryPreference {
    return { pending, choice, choose: fn() };
  }

  const accepted = answer("accepted");

  const { Story } = defineMeta({
    title: "Shell/Privacy",
    component: PrivacyScreen,
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
    await expect(canvas.getByRole("switch")).toBeChecked();
    await userEvent.click(canvas.getByText(t("telemetryConsent.title")));
    await expect(accepted.choose).toHaveBeenCalledWith("declined");
  }
</script>

<Story
  name="Accepted — desktop"
  exportName="AcceptedDesktop"
  args={{ telemetry: accepted }}
  globals={reviewStoryGlobals.desktop}
  play={verifyWithdrawal}
/>

<Story
  name="Accepted — mobile"
  exportName="AcceptedMobile"
  args={{ telemetry: answer("accepted") }}
  globals={reviewStoryGlobals.mobile}
/>

<Story name="Declined" args={{ telemetry: answer("declined") }} />

<Story name="Not answered" exportName="NotAnswered" args={{ telemetry: answer(undefined) }} />

<Story name="Reading the answer" exportName="ReadingTheAnswer" args={{ telemetry: answer(undefined, true) }} />

<Story name="Not collecting" exportName="NotCollecting" args={{ telemetry: null }} />
