import { compose, expect, test } from "./fixtures";

import { screenshot } from "@a-novel-kit/nodelib-test/playwright";

import type { Page } from "playwright/test";

async function login(page: Page, account: { email: string; password: string }) {
  await page.getByLabel(/^Email address/).fill(account.email);
  await page.getByLabel(/^Password/).fill(account.password);
  await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
}

async function authenticationResponds(): Promise<boolean> {
  try {
    return (await fetch("http://127.0.0.1:14100/v2/ping")).ok;
  } catch {
    return false;
  }
}

test("login returns to the protected account, survives reload and logout protects it again", async ({
  page,
  context,
  account,
}, info) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/auth=login&returnTo=%2Faccount/);
  await expect(page).toHaveTitle("Log in | Agora");

  await login(page, account);
  await expect(page).toHaveURL("/account");
  await expect(page).toHaveTitle("Account | Agora");
  await expect(page.getByRole("heading", { name: "Manage your account", exact: true })).toBeVisible();
  await expect(page.getByText("auth:user", { exact: true })).toBeVisible();

  const cookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith("template_"));
  expect(cookies.map((cookie) => cookie.name)).toEqual(
    expect.arrayContaining(["template_access_token", "template_refresh_token"])
  );
  expect(cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);

  await page.reload();
  await expect(page.getByText("auth:user", { exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Account | Agora");
  const perRunValues = ["Account ID", "Current email", "Access expires", "Session expires"].map((label) =>
    page.getByText(label, { exact: true }).locator("+ dd")
  );
  await screenshot(page, info, "authenticated-account", perRunValues);

  await page.getByRole("button", { name: "Log out", exact: true }).last().click();
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Home | Agora");
  expect((await context.cookies()).filter((cookie) => cookie.name.startsWith("template_"))).toEqual([]);

  // Logout revoked the refresh token, so the service refuses to renew the session with it.
  const tokens = Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
  const renewal = await fetch("http://127.0.0.1:14100/v2/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: tokens.template_access_token, refreshToken: tokens.template_refresh_token }),
  });
  expect(renewal.status).toBe(403);

  await page.goto("/account");
  await expect(page).toHaveURL(/auth=login&returnTo=%2Faccount/);
  await expect(page.getByText("auth:user", { exact: true })).toHaveCount(0);
});

test("dialog history and keyboard dismissal restore the shell focus", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Home | Agora");
  if (isMobile) await page.getByRole("link", { name: "Open navigation", exact: true }).click();

  const trigger = page.getByRole("link", { name: "Log in", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Log in", exact: true })).toBeVisible();
  await expect(page).toHaveURL(isMobile ? "/?menu=open&auth=login" : "/?auth=login");
  await expect(page).toHaveTitle("Log in | Agora");
  await expect(page.getByRole("link", { name: "Close dialog" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/^Email address/)).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(isMobile ? "/?menu=open" : "/");
  await expect(page).toHaveTitle("Home | Agora");
  await expect(page.getByRole("dialog", { name: "Log in", exact: true })).toHaveCount(0);

  await page.goForward();
  await expect(page.getByRole("dialog", { name: "Log in", exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Log in | Agora");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Log in", exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(isMobile ? "/?menu=open" : "/");
  await expect(page).toHaveTitle("Home | Agora");
  await expect(trigger).toBeFocused();

  if (isMobile) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Open navigation", exact: true })).toBeFocused();
  }
});

test("navigation controls preserve the rail preference and drawer focus", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("link", { name: "Open navigation", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Open navigation", exact: true })).toBeFocused();
    return;
  }

  await page.getByRole("button", { name: "Collapse navigation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Expand navigation", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Expand navigation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Expand navigation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Collapse navigation", exact: true })).toBeVisible();
});

test("an authentication outage preserves the session and recovers after reload", async ({
  page,
  context,
  account,
}, info) => {
  await page.goto("/?auth=login&returnTo=%2Faccount");
  await login(page, account);
  await expect(page.getByText("auth:user", { exact: true })).toBeVisible();

  const cookies = await context.cookies();
  try {
    await compose("stop", "authentication");
    await page.reload();
    await expect(page.getByText("Session details unavailable", { exact: true })).toBeVisible();
    await expect(page).toHaveTitle("Account: Session details unavailable | Agora");
    expect(await context.cookies()).toEqual(cookies);
    await screenshot(page, info, "recoverable-service-outage");
  } finally {
    await compose("start", "authentication");
    await expect.poll(authenticationResponds, { timeout: 30_000 }).toBe(true);
  }

  await page.reload();
  await expect(page.getByText("auth:user", { exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Account | Agora");
});

test.describe("native forms without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shell links open and close a usable login form", async ({ page, isMobile }) => {
    await page.goto("/?returnTo=%2Faccount");
    if (isMobile) {
      await page.getByRole("link", { name: "Open navigation", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Agora", exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Close navigation", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("link", { name: "Open navigation", exact: true }).click();
    }

    await page.getByRole("link", { name: "Log in", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(page).toHaveTitle("Log in | Agora");
    await dialog.getByLabel(/^Email address/).fill("invalid");
    await dialog.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(dialog.getByText("Enter a valid email address.", { exact: true })).toBeVisible();

    await dialog.getByRole("link", { name: "Close dialog" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL("/?returnTo=%2Faccount");
  });

  test("login validates on the server and returns to the protected destination", async ({ page, account }) => {
    await page.goto("/account");
    await expect(page.getByRole("dialog", { name: "Log in", exact: true })).toBeVisible();
    await login(page, { ...account, password: "Incorrect-password-42!" });
    await expect(page.getByText("The email address or password is incorrect.", { exact: true })).toBeVisible();

    await login(page, account);
    await expect(page).toHaveURL("/account");
    await expect(page.getByText("auth:user", { exact: true })).toBeVisible();
  });

  test("the account logout works with a server-rendered form", async ({ page, account }) => {
    await page.goto("/?auth=login&returnTo=%2Faccount");
    await login(page, account);
    await expect(page).toHaveTitle("Account | Agora");

    await page.getByRole("button", { name: "Log out", exact: true }).last().click();
    await expect(page).toHaveURL("/");

    await page.goto("/account");
    await expect(page).toHaveURL(/auth=login&returnTo=%2Faccount/);
  });
});
