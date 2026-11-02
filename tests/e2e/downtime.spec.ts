import { platformOrigin } from "./downtime";
import { expect, test } from "./fixtures";

import { screenshot } from "@a-novel-kit/nodelib-test/playwright";

import type { Page } from "playwright/test";

function banner(page: Page, title: string) {
  return page.getByRole("status").filter({ hasText: title });
}

test.describe("scheduled maintenance", () => {
  test.use({ baseURL: platformOrigin("scheduled"), timezoneId: "Europe/Paris" });

  test("announces the expected window in the visitor's time zone and keeps sign-in open", async ({
    page,
    request,
  }, info) => {
    await page.goto("/");
    // Published as 06:00 to 08:30 UTC, an hour later in Paris in January. No-break spaces keep the
    // time frame on one line.
    await expect(banner(page, "Scheduled maintenance")).toContainText(/Jan\s12,\s2099,\s7:00\s–\s9:30\sAM\sGMT\+1/);
    await screenshot(page, info, "maintenance-scheduled");

    const signIn = await request.get("/auth/sign-in", { maxRedirects: 0 });
    expect(signIn.status()).toBe(303);
    expect(signIn.headers().location).toMatch(/^http:\/\/127\.0\.0\.1:14102\/authorize\?/);
  });

  test("turns into maintenance in progress when the start passes", async ({ page }) => {
    await page.clock.install({ time: new Date("2099-01-12T05:59:00Z") });
    await page.goto("/");
    await expect(banner(page, "Scheduled maintenance")).toBeVisible();
    await page.clock.fastForward("01:00");
    await expect(banner(page, "Maintenance in progress")).toBeVisible();
  });
});

test.describe("maintenance in progress", () => {
  test.use({ baseURL: platformOrigin("started") });

  test("locks sign-in until operators clear it", async ({ page }, info) => {
    await page.goto("/");
    await expect(banner(page, "Maintenance in progress")).toContainText("Jan 12, 2099");
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);

    // The account platform's app list opens this address too.
    const signIn = await page.goto("/auth/sign-in");
    expect(signIn?.status()).toBe(503);
    await expect(page).toHaveTitle("Maintenance in progress | Agora");
    await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
    await screenshot(page, info, "maintenance-sign-in");
  });
});
