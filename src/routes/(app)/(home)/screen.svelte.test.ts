import I18nProvider from "#lib/i18n/I18nProvider.svelte";

import Screen from "./screen.svelte";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";

describe("Screen", () => {
  it("keeps an accessible title on the intentionally empty workspace", async () => {
    render(
      Screen,
      {},
      {
        wrapper: I18nProvider,
        wrapperProps: { locale: "en" },
      }
    );

    await expect.element(page.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});
