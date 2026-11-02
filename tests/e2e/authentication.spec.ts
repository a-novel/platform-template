import { accountOrigin, compose, expect, test } from "./fixtures";
import { callerFetch, platformCaller } from "./service-token";

import { screenshot } from "@a-novel-kit/nodelib-test/playwright";
import { AuthenticationApi, refreshTokenGrant } from "@a-novel/service-authentication-rest";

import type { BrowserContext, Page } from "playwright/test";

const platformOrigin = "http://127.0.0.1:4173";
const platformApi = new AuthenticationApi("http://127.0.0.1:14100", callerFetch(platformCaller));

interface Account {
  email: string;
  password: string;
}

/** Opens the menu that holds the account controls on a phone. The rail shows them on a desktop. */
async function openAccountControls(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("link", { name: "Open navigation", exact: true }).click();
}

/** Fills and submits the account platform's login dialog. */
async function submitLogin(page: Page, account: Account) {
  const dialog = page.getByRole("dialog", { name: "Log in" });
  await dialog.getByLabel(/^Email address/).fill(account.email);
  await dialog.getByLabel(/^Password/).fill(account.password);
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
}

/** Logs in on the account platform, where a sign-in from the platform lands a visitor signed out there. */
async function logInOnAccountPlatform(page: Page, account: Account) {
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:14102\/\?auth=login&returnTo=%2Fauthorize%3F/);
  await submitLogin(page, account);
}

/** Opens a session on the account platform itself, before the visitor reaches the platform. */
async function openAccountSession(page: Page, account: Account) {
  await page.goto(`${accountOrigin}/?auth=login`);
  await submitLogin(page, account);
  await expect(page.getByRole("button", { name: "Log out", exact: true }).last()).toBeAttached();
}

/** Signs in from the platform's page at `path`, through the account platform's login. */
async function signIn(page: Page, account: Account, isMobile: boolean, path = "/") {
  await page.goto(path);
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await logInOnAccountPlatform(page, account);
  await expect(page).toHaveURL(path);
}

/** The account link, named after the email of the fixtures' accounts, which tells the visitor is signed in. */
async function accountLink(page: Page, isMobile: boolean) {
  await openAccountControls(page, isMobile);
  return page.getByRole("link", { name: "Template Tester (opens in a new tab)", exact: true });
}

/** The platform's cookies, the pending sign-in's included. The account platform's share the host. */
async function tokenCookies(context: BrowserContext) {
  return (await context.cookies()).filter((cookie) => cookie.name.startsWith("template_"));
}

async function authenticationResponds(): Promise<boolean> {
  try {
    return (await fetch("http://127.0.0.1:14100/v2/ping")).ok;
  } catch {
    return false;
  }
}

test("signs in from signed out through the account platform and returns to the page", async ({
  page,
  context,
  account,
  isMobile,
}, info) => {
  const callback = page.waitForRequest((request) => request.url().startsWith(`${platformOrigin}/auth/callback?`));
  await signIn(page, account, isMobile, "/privacy");

  // The callback strips the code from the address bar and from any referrer.
  const response = await (await callback).response();
  expect(response?.status()).toBe(303);
  expect(response?.headers()).toMatchObject({
    location: "/privacy",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });

  const cookies = await tokenCookies(context);
  expect(cookies.map((cookie) => cookie.name).sort()).toEqual([
    "template_access_token",
    "template_identity_handle",
    "template_refresh_token",
  ]);
  expect(cookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);

  // The session survives a new page load, which the checkpoint captures on the home page.
  await page.goto("/");
  await expect(await accountLink(page, isMobile)).toHaveAttribute("href", `${accountOrigin}/account`);
  await screenshot(page, info, "authenticated-shell");
});

test("signs in without a form while the account platform's session is open", async ({ page, account, isMobile }) => {
  await openAccountSession(page, account);

  // "Log in" comes back signed in after two redirects, with no form on the account platform.
  await page.goto("/privacy");
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("/privacy");
  await expect(await accountLink(page, isMobile)).toBeVisible();
});

test("logging out of the platform ends the session on the account platform too", async ({
  page,
  context,
  account,
  isMobile,
}) => {
  await signIn(page, account, isMobile);
  const tokens = Object.fromEntries((await tokenCookies(context)).map((cookie) => [cookie.name, cookie.value]));

  await openAccountControls(page, isMobile);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await tokenCookies(context)).toEqual([]);

  // Authentication ended the whole session, so the platform's refresh token no longer renews it.
  await expect(refreshTokenGrant(platformApi, tokens.template_refresh_token ?? "")).rejects.toMatchObject({
    response: { error: "invalid_grant" },
  });

  // The account platform finds its session ended on its next request.
  await page.goto(`${accountOrigin}/account`);
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:14102\/\?auth=login&returnTo=%2Faccount$/);

  // A new sign-in from the platform asks for the password again.
  await page.goto("/");
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Log in" })).toBeVisible();
});

test("logging out of the account platform ends the platform's session on its next request", async ({
  page,
  context,
  account,
  isMobile,
}) => {
  await signIn(page, account, isMobile);

  await page.goto(`${accountOrigin}/`);
  await page.getByRole("button", { name: "Log out", exact: true }).last().click();
  await expect(page).toHaveURL(`${accountOrigin}/`);

  await page.goto("/");
  await openAccountControls(page, isMobile);
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  expect(await tokenCookies(context)).toEqual([]);
});

test("a failed exchange returns to the signed-out page, whose retry signs in", async ({
  page,
  context,
  account,
  isMobile,
}, info) => {
  await openAccountSession(page, account);

  // The browser's own requests follow the sign-in to the code, which reaches the platform altered, so
  // Authentication refuses the exchange.
  const authorization = await page.request.get("/auth/sign-in?returnTo=%2Fprivacy", { maxRedirects: 0 });
  const response = await page.request.get(authorization.headers().location ?? "", { maxRedirects: 0 });
  const callback = new URL(response.headers().location ?? "");
  expect(callback.searchParams.get("code")).toEqual(expect.any(String));
  callback.searchParams.set("code", "forged-code");
  await page.goto(callback.href);

  await expect(page).toHaveURL("/auth/sign-in/failed?returnTo=%2Fprivacy");
  await expect(page).toHaveTitle("We couldn’t log you in | Agora");
  await expect(page.getByRole("heading", { name: "We couldn’t log you in", level: 1 })).toBeVisible();
  expect(await tokenCookies(context)).toEqual([]);
  await screenshot(page, info, "sign-in-failed");

  // The account platform's session is still open, so the retry comes back signed in without a form.
  await page.getByRole("link", { name: "Try again", exact: true }).click();
  await expect(page).toHaveURL("/privacy");
  await expect(await accountLink(page, isMobile)).toBeVisible();
});

test("Register opens the account platform's invitation request", async ({ page, isMobile }) => {
  await page.goto("/");
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Register", exact: true }).click();

  await expect(page).toHaveURL(`${accountOrigin}/?auth=register`);
  await expect(page.getByRole("dialog", { name: "Join the Agora invitation list" })).toBeVisible();
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
  isMobile,
}, info) => {
  await signIn(page, account, isMobile);

  const cookies = await context.cookies();
  try {
    await compose("stop", "authentication");
    await page.reload();
    await openAccountControls(page, isMobile);
    await expect(
      page.getByText("Account details are unavailable.", { exact: true }).filter({ visible: true })
    ).toBeVisible();
    expect(await context.cookies()).toEqual(cookies);
    await screenshot(page, info, "recoverable-service-outage");
  } finally {
    await compose("start", "authentication");
    await expect.poll(authenticationResponds, { timeout: 30_000 }).toBe(true);
  }

  await page.goto("/");
  await expect(await accountLink(page, isMobile)).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shell links open and close the menu, and sign in through the account platform", async ({
    page,
    account,
    isMobile,
  }) => {
    await page.goto("/privacy");
    if (isMobile) {
      await page.getByRole("link", { name: "Open navigation", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Agora", exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Close navigation", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.getByRole("link", { name: "Open navigation", exact: true }).click();
    }

    await page.getByRole("link", { name: "Log in", exact: true }).click();
    await logInOnAccountPlatform(page, account);

    await expect(page).toHaveURL("/privacy");
    await expect(page).toHaveTitle("Privacy | Agora");
  });
});
