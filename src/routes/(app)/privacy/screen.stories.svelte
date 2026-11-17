<script module lang="ts">
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";

  import PrivacyScreen from "./screen.svelte";

  import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";
  import type { TelemetryPreference } from "@a-novel-kit/nodelib-svelte";
  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, fn, within } from "storybook/test";

  /** A fixed answer: choosing reports the request without changing the scenario. */
  function answer(choice: TelemetryChoice | undefined): TelemetryPreference {
    return { choice, choose: fn() };
  }

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

  type PlayContext = Pick<StoryContext, "canvasElement" | "globals">;

  /** Checks that the switch shows the device's answer under the page's title. */
  function verifyAnswer(checked: boolean) {
    return async ({ canvasElement, globals }: PlayContext) => {
      const canvas = within(canvasElement);
      const t = createStorybookTranslator(globals);
      await expect(canvas.getByRole("heading", { name: t("privacy.title"), level: 1 })).toBeVisible();
      const setting = canvas.getByRole("switch", { name: new RegExp(`^${t("telemetryConsent.title")}`) });
      if (checked) await expect(setting).toBeChecked();
      else await expect(setting).not.toBeChecked();
    };
  }

  async function verifyNotCollecting({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.queryByRole("switch")).not.toBeInTheDocument();
    await expect(canvas.getByText(t("privacy.noTelemetry"))).toBeVisible();
  }
</script>

<Story
  name="Accepted — desktop"
  exportName="AcceptedDesktop"
  args={{ telemetry: answer("accepted") }}
  globals={reviewStoryGlobals.desktop}
  play={verifyAnswer(true)}
/>

<Story
  name="Accepted — mobile"
  exportName="AcceptedMobile"
  args={{ telemetry: answer("accepted") }}
  globals={reviewStoryGlobals.mobile}
/>

<Story name="Declined" args={{ telemetry: answer("declined") }} play={verifyAnswer(false)} />

<Story name="Not answered" exportName="NotAnswered" args={{ telemetry: answer(undefined) }} />

<Story name="Not collecting" exportName="NotCollecting" args={{ telemetry: null }} play={verifyNotCollecting} />
