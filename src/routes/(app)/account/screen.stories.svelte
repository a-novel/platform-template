<script module lang="ts">
  import type { AccountScreenModel } from "#lib/application/auth/types.js";
  import { createStorybookTranslator, storybookLocale } from "#lib/i18n/storybook.js";

  import StoryHarness from "./story.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, within } from "storybook/test";

  const ready = {
    claims: {
      status: "ready",
      userId: "2f798f4a-0694-4f68-9928-42f3e906e871",
      roles: ["auth:user"],
      accessExpiresAt: "2026-08-18T19:30:00Z",
      refreshExpiresAt: "2026-08-25T18:30:00Z",
    },
    logoutState: "ready",
  } satisfies AccountScreenModel;

  const { Story } = defineMeta({
    title: "Authentication/Account screen",
    tags: ["!autodocs"],
    parameters: {
      layout: "fullscreen",
    },
  });

  type PlayContext = Pick<StoryContext, "canvasElement" | "globals">;

  async function verifySessionFits({ canvasElement, globals }: PlayContext) {
    const t = createStorybookTranslator(globals);
    const recap = within(canvasElement).getByRole("region", { name: t("authUi.account.claims.title") });
    const bounds = recap.getBoundingClientRect();
    const summary = within(recap);
    await expect(summary.queryByRole("note")).not.toBeInTheDocument();
    for (const value of [summary.getByRole("heading"), ...summary.getAllByRole("definition")]) {
      const box = value.getBoundingClientRect();
      await expect(box.left).toBeGreaterThanOrEqual(bounds.left);
      await expect(box.right).toBeLessThanOrEqual(bounds.right);
      await expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
    }
  }

  async function verifyReadyAccount({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await verifySessionFits({ canvasElement, globals });
    await expect(canvas.getByRole("heading", { name: t("authUi.account.title"), level: 1 })).toBeVisible();
    await expect(canvas.getByText("2f798f4a-0694-4f68-9928-42f3e906e871")).toBeVisible();
    const accessExpiry = new Intl.DateTimeFormat(storybookLocale(globals), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(ready.claims.accessExpiresAt));
    await expect(canvas.getByText(accessExpiry)).toBeVisible();
    const session = canvas.getByRole("region", { name: t("authUi.account.claims.title") });
    await expect(within(session).getByRole("button", { name: t("authUi.account.logout.submit") })).toBeVisible();
  }

  async function verifyLogoutAvailable({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const recap = canvas.getByRole("region", { name: t("authUi.account.claims.title") });
    await expect(within(recap).getByRole("alert")).toBeVisible();
    await expect(canvas.getByRole("button", { name: t("authUi.account.logout.submit") })).toBeEnabled();
  }
</script>

<Story
  name="Ready — desktop"
  exportName="ReadyDesktop"
  globals={reviewStoryGlobals.desktop}
  asChild
  play={verifyReadyAccount}
>
  <StoryHarness initialModel={ready} />
</Story>

<Story
  name="Ready — mobile"
  exportName="ReadyMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyReadyAccount}
>
  <StoryHarness initialModel={ready} />
</Story>

<Story name="Loading" asChild>
  <StoryHarness initialModel={{ ...ready, claims: { status: "loading" } }} />
</Story>

<Story name="Load error" asChild play={verifyLogoutAvailable}>
  <StoryHarness initialModel={{ ...ready, claims: { status: "error", feedback: "sessionUnavailable" } }} />
</Story>

<Story name="Logout submitting" asChild>
  <StoryHarness initialModel={{ ...ready, logoutState: "submitting" }} />
</Story>

<Story name="Long content — mobile" globals={reviewStoryGlobals.mobile} asChild play={verifySessionFits}>
  <StoryHarness
    initialModel={{
      ...ready,
      claims: {
        ...ready.claims,
        roles: ["auth:user", "auth:admin"],
        accessExpiresAt: "2026-09-18T19:30:00Z",
        refreshExpiresAt: "2026-09-25T18:30:00Z",
      },
    }}
  />
</Story>
