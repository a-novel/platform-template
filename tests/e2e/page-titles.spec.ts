import { expect, test } from "./fixtures";

import { screenshot } from "@a-novel-kit/nodelib-test/playwright";

import type { Page, TestInfo } from "playwright/test";

const locales = [
  {
    locale: "en-US",
    routes: [
      ["/", "Home"],
      ["/?auth=login", "Log in"],
      ["/account", "Log in"],
      ["/?auth=unknown&email=private@example.test", "Home"],
      ["/page-that-does-not-exist", "Page not found"],
    ],
  },
  {
    locale: "fr-FR",
    routes: [
      ["/", "Accueil"],
      ["/?auth=login", "Connectez-vous"],
      ["/account", "Connectez-vous"],
      ["/?auth=unknown&email=private@example.test", "Accueil"],
      ["/page-that-does-not-exist", "Page introuvable"],
    ],
  },
] as const;

/** Fixed checkpoint names, so a copy change shows as a reviewable diff. */
const checkpoints: Partial<Record<string, string>> = {
  "/": "home",
  "/?auth=login": "login",
};

/** Opens a route and checks its tab title. A capturing run also records the route's checkpoint. */
async function expectTitle(page: Page, info: TestInfo, route: string, title: string, capture: boolean) {
  const response = await page.goto(route);
  await expect(page).toHaveTitle(`${title} — Agora`);
  await expect(page.locator("head > title")).toHaveCount(1);
  if (route === "/page-that-does-not-exist") expect(response?.status()).toBe(404);

  const checkpoint = checkpoints[route];
  if (!capture || !checkpoint) return;

  if (route !== "/") await expect(page.getByRole("dialog")).toBeVisible();
  await screenshot(page, info, checkpoint);
}

for (const { locale, routes } of locales) {
  for (const javaScriptEnabled of [true, false]) {
    test.describe(`${locale}, JavaScript ${javaScriptEnabled ? "enabled" : "disabled"}`, () => {
      test.use({ locale, javaScriptEnabled });

      test("page titles identify each route and authentication task", async ({ page }, info) => {
        const capture = locale === "en-US" && javaScriptEnabled;
        for (const [route, title] of routes) {
          await test.step(route, () => expectTitle(page, info, route, title, capture));
        }
      });
    });
  }
}
