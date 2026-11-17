<script module lang="ts">
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";

  import Screen from "./screen.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, within } from "storybook/test";

  const retryHref = "/auth/sign-in?returnTo=%2Fprivacy";

  const { Story } = defineMeta({
    title: "Authentication/Sign-in failed",
    component: Screen,
    tags: ["!autodocs"],
    parameters: { layout: "fullscreen" },
    args: { failure: "rejected", retryHref },
  });

  /** Checks that the page explains the failure and retries through the sign-in route with a full page load. */
  function verifyFailure(
    description: "signInFailed.rejected" | "signInFailed.unavailable" | "signInFailed.rateLimited"
  ) {
    return async ({ canvasElement, globals }: Pick<StoryContext, "canvasElement" | "globals">) => {
      const canvas = within(canvasElement);
      const t = createStorybookTranslator(globals);
      await expect(canvas.getByRole("heading", { name: t("signInFailed.title"), level: 1 })).toBeVisible();
      await expect(canvas.getByText(t(description))).toBeVisible();
      const retry = canvas.getByRole("link", { name: t("signInFailed.retry") });
      await expect(retry).toHaveAttribute("href", retryHref);
      await expect(retry).toHaveAttribute("data-sveltekit-reload", "true");
    };
  }
</script>

<Story
  name="Rejected, desktop"
  exportName="RejectedDesktop"
  globals={reviewStoryGlobals.desktop}
  play={verifyFailure("signInFailed.rejected")}
/>
<Story name="Rejected, mobile" exportName="RejectedMobile" globals={reviewStoryGlobals.mobile} />
<Story name="Unavailable" args={{ failure: "unavailable" }} play={verifyFailure("signInFailed.unavailable")} />
<Story name="Rate limited" args={{ failure: "rate-limited" }} play={verifyFailure("signInFailed.rateLimited")} />
