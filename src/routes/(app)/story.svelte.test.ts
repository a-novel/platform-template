import type { ShellViewModel } from "#lib/application/shell/types.js";
import { withLocale } from "#lib/i18n/provider.fixture.js";

import ShellStory from "./story.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page, userEvent } from "vitest/browser";

import "@a-novel-kit/uikit-fonts/fonts.css";
import "@a-novel-kit/uikit-tokens/tokens.css";

const shell: ShellViewModel = {
  activeNavigation: "home",
  drawerOpen: true,
  rail: "expanded",
  session: { status: "authenticated" },
};

describe("fixed visual review controllers", () => {
  it("keeps the open menu and the session after dismissal and logout", async () => {
    render(ShellStory, { initialModel: shell }, withLocale());
    const menu = page.getByRole("dialog", { name: "Agora" });

    await menu.getByRole("link", { name: "Close navigation" }).click();
    await userEvent.keyboard("{Escape}");
    await menu.getByRole("button", { name: "Log out" }).click();

    await expect.element(menu).toBeVisible();
    await expect.element(menu.getByRole("link", { name: "Manage your account (opens in a new tab)" })).toBeVisible();
  });
});
