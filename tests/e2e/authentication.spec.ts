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
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:14102\/account\?auth=login&returnTo=%2Fauthorize%3F/);
  await submitLogin(page, account);
}

/** Opens a session on the account platform itself, before the visitor reaches the platform. */
async function openAccountSession(page: Page, account: Account) {
  await page.goto(`${accountOrigin}/account?auth=login`);
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
  return page.getByRole("link", { name: "Template Tester", exact: true });
}

/** The platform's cookies, the pending sign-in's included. The account platform's share the host. */
async function tokenCookies(context: BrowserContext) {
  return (await context.cookies()).filter((cookie) => cookie.name.startsWith("__Host-template_"));
}

/**
 * Ends the five minutes in which the platform trusts the access token without asking Authentication,
 * so the next request checks the session.
 */
async function endSessionCheckWindow(context: BrowserContext) {
  await context.clearCookies({ name: "__Host-template_session_checked" });
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
  await signIn(page, account, isMobile);

  // The callback strips the code from the address bar and from any referrer.
  const response = await (await callback).response();
  expect(response?.status()).toBe(303);
  expect(response?.headers()).toMatchObject({
    location: "/",
    // The callback sets the session, so the request hook keeps it out of every cache.
    "cache-control": "private, no-store",
    "referrer-policy": "no-referrer",
  });

  const cookies = await tokenCookies(context);
  expect(cookies.map((cookie) => cookie.name).sort()).toEqual([
    "__Host-template_access_token",
    "__Host-template_identity_handle",
    "__Host-template_refresh_token",
    "__Host-template_session_checked",
  ]);
  expect(
    cookies.every((cookie) => cookie.httpOnly && cookie.secure && cookie.path === "/" && cookie.sameSite === "Lax")
  ).toBe(true);
  // The tokens end with the browser, and Authentication's check of the session after five minutes.
  const checked = cookies.find((cookie) => cookie.name === "__Host-template_session_checked");
  expect(checked?.expires).toBeLessThanOrEqual(Date.now() / 1000 + 300);
  expect(cookies.filter((cookie) => cookie.expires !== -1)).toEqual([checked]);

  // The session survives a new page load, which the checkpoint captures on the home page.
  await page.goto("/");
  await expect(await accountLink(page, isMobile)).toHaveAttribute("href", `${accountOrigin}/account`);
  await screenshot(page, info, "authenticated-shell");
});

test("signs in without a form while the account platform's session is open", async ({ page, account, isMobile }) => {
  await openAccountSession(page, account);

  // "Log in" comes back signed in after two redirects, with no form on the account platform.
  await page.goto("/");
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("/");
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
  await expect(refreshTokenGrant(platformApi, tokens["__Host-template_refresh_token"] ?? "")).rejects.toMatchObject({
    response: { error: "invalid_grant" },
  });

  // The account platform trusts a recent check for five minutes, then finds the session ended.
  await context.clearCookies({ name: "__Host-account_session_checked" });
  await page.goto(`${accountOrigin}/account`);
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:14102\/account\?auth=login&returnTo=%2Faccount$/);

  // A new sign-in from the platform asks for the password again.
  await page.goto("/");
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Log in" })).toBeVisible();
});

test("logging out of the account platform ends the platform's session at its next check", async ({
  page,
  context,
  account,
  isMobile,
}) => {
  await signIn(page, account, isMobile);

  await page.goto(`${accountOrigin}/account`);
  await page.getByRole("button", { name: "Log out", exact: true }).last().click();
  await expect(page).toHaveURL(`${accountOrigin}/account?auth=login&returnTo=%2Faccount`);

  // Within five minutes of its last check, the platform trusts the token's signature alone.
  await page.goto("/");
  await expect(await accountLink(page, isMobile)).toBeVisible();

  await endSessionCheckWindow(context);
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
  const authorization = await page.request.get("/auth/sign-in?returnTo=%2F", { maxRedirects: 0 });
  const response = await page.request.get(authorization.headers().location ?? "", { maxRedirects: 0 });
  const callback = new URL(response.headers().location ?? "");
  expect(callback.searchParams.get("code")).toEqual(expect.any(String));
  callback.searchParams.set("code", "forged-code");
  await page.goto(callback.href);

  await expect(page).toHaveURL("/auth/sign-in/failed?returnTo=%2F");
  await expect(page).toHaveTitle("We couldn’t log you in | Agora");
  await expect(page.getByRole("heading", { name: "We couldn’t log you in", level: 1 })).toBeVisible();
  expect(await tokenCookies(context)).toEqual([]);
  await screenshot(page, info, "sign-in-failed");

  // The account platform's session is still open, so the retry comes back signed in without a form.
  await page.getByRole("link", { name: "Try again", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(await accountLink(page, isMobile)).toBeVisible();
});

test("Register opens the account platform's invitation request", async ({ page, isMobile }) => {
  await page.goto("/");
  await openAccountControls(page, isMobile);
  await page.getByRole("link", { name: "Register", exact: true }).click();

  await expect(page).toHaveURL(`${accountOrigin}/account?auth=register`);
  await expect(page.getByRole("dialog", { name: "Join the Agora invitation list" })).toBeVisible();
});

test("navigation controls keep the rail from the first paint, and the drawer focus", async ({ page, isMobile }) => {
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

  // The server renders the rail the visitor left, so the page never shows it expanded first.
  const html = await (await page.request.get("/")).text();
  expect(html).toContain('data-rail="collapsed"');
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

  await endSessionCheckWindow(context);
  const cookies = await context.cookies();
  try {
    await compose("stop", "authentication");
    await page.reload();
    await openAccountControls(page, isMobile);
    await expect(page.getByRole("link", { name: "Manage your account", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
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

    // A logged-in visitor changes the shared answer from their account, so Privacy hands them over.
    await expect(page).toHaveURL(`${accountOrigin}/account/privacy`);
  });
});
