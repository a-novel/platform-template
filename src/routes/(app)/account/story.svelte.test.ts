import type { AccountScreenModel } from "#lib/application/auth/types.js";
import { withLocale } from "#lib/i18n/provider.fixture.js";

import AccountStory from "./story.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

import "@a-novel-kit/uikit-fonts/fonts.css";
import "@a-novel-kit/uikit-tokens/tokens.css";

describe("fixed visual review controllers", () => {
  it("pins the account logout instead of leaving the review page submitting", async () => {
    const initialModel: AccountScreenModel = { claims: { status: "loading" }, logoutState: "ready" };
    render(AccountStory, { initialModel }, withLocale());
    const logout = page.getByRole("button", { name: "Log out", exact: true });
    await logout.click();
    await expect.element(logout).toBeEnabled();
    expect((logout.element() as HTMLButtonElement).form?.getAttribute("aria-busy")).toBe("false");
  });

  it("changes the telemetry answer from the privacy section", async () => {
    const initialModel: AccountScreenModel = { claims: { status: "loading" }, logoutState: "ready" };
    render(AccountStory, { initialModel, telemetryChoice: "declined" }, withLocale());
    const setting = page.getByRole("switch", { name: /Metrics and log collection/ });
    await expect.element(setting).not.toBeChecked();

    await setting.click();

    await expect.element(setting).toBeChecked();
  });
});
