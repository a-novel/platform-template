<script module lang="ts">
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";

  import type { ShellViewModel } from "./controller.svelte";
  import { portraitPicture } from "./picture.fixture";
  import StoryHarness from "./story.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";
  import ScrollPreview from "@a-novel-kit/uikit-storybook/ScrollPreview.svelte";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, waitFor, within } from "storybook/test";

  const anonymous: ShellViewModel = {
    activeNavigation: "home",
    drawerOpen: false,
    rail: "expanded",
    session: { status: "anonymous" },
  };
  const authenticated: ShellViewModel = {
    ...anonymous,
    session: { status: "authenticated", displayName: "Maya Chen", initials: "MC" },
  };
  const withPicture: ShellViewModel = {
    ...anonymous,
    // A profile with a username and a picture: the username names the account, the handle keeps the initials.
    session: { status: "authenticated", displayName: "Moonlit Maya 🌊", initials: "MC", picture: portraitPicture },
  };
  const unnamedAccount: ShellViewModel = {
    ...anonymous,
    session: { status: "authenticated" },
  };
  const longName = "Alexandrine de la Bibliothèque des Mondes Imaginaires";
  const longAccountName: ShellViewModel = {
    ...anonymous,
    session: { status: "authenticated", displayName: longName, initials: "AB" },
  };
  const loadingAccount: ShellViewModel = {
    ...anonymous,
    session: { status: "loading" },
  };
  // Fixed times keep every rendering identical.
  const downtime = { start: new Date("2026-10-12T06:00:00Z"), end: new Date("2026-10-12T08:30:00Z") };

  function withOpenMobileNavigation(model: ShellViewModel): ShellViewModel {
    return { ...model, drawerOpen: true };
  }

  const { Story } = defineMeta({
    title: "Shell/Platform shell",
    tags: ["!autodocs"],
    parameters: {
      layout: "fullscreen",
    },
  });

  type PlayContext = Pick<StoryContext, "canvasElement" | "globals">;

  // Chrome 158 reports `justify-content: flex-start` as flow-start.
  const startAligned = /^(flex|flow)-start$/;

  async function verifyAnonymousAuthentication({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("main")).toBeVisible();
    await expect(canvas.getByRole("link", { name: t("shell.home") })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("img", { name: t("shell.brand") })).toHaveAttribute("width", "96");

    const signIn = canvas.getByRole("link", { name: t("shell.signIn") });
    await expect(signIn).toHaveAttribute("href", "#sign-in");
    // The sign-in route redirects to the account platform, which the client router cannot render.
    await expect(signIn).toHaveAttribute("data-sveltekit-reload", "true");
    await expect(getComputedStyle(signIn).justifyContent).toMatch(startAligned);
    const invitation = canvas.getByRole("link", { name: t("shell.register") });
    await expect(invitation).toHaveAttribute("href", "#invitation");
    await expect(getComputedStyle(invitation).justifyContent).toMatch(startAligned);
    await expect(canvas.queryByRole("button", { name: t("shell.logout") })).not.toBeInTheDocument();
    // Only a platform that collects browser telemetry lists Privacy.
    await expect(canvas.queryByRole("link", { name: t("shell.privacy") })).not.toBeInTheDocument();
  }

  async function verifyWithoutAccountLinks({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("link", { name: t("shell.signIn") })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t("shell.register") })).not.toBeInTheDocument();
  }

  async function verifyCollapsedRail({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("img", { name: t("shell.brand") })).toHaveAttribute("width", "24");
    const toggle = canvas.getByRole("button", { name: t("shell.expandNavigation") });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    // The compact rail shows icons alone, which keep their names.
    for (const name of [t("shell.home"), t("shell.signIn"), t("shell.register")])
      await expect(canvas.getByRole("link", { name })).toBeVisible();
  }

  async function verifyExpandedMobileNavigation({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const navigation = canvas.getByRole("dialog", { name: t("shell.brand") });
    await expect(navigation).toBeVisible();
    await expect(within(navigation).getByRole("img", { name: t("shell.brand") })).toHaveAttribute("width", "96");
  }

  async function verifyCollapsedMobileNavigation({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const openNavigation = canvas.getByRole("link", { name: t("shell.openNavigation") });
    const mobileHeader = openNavigation.closest("header");
    if (!mobileHeader) throw new Error("The mobile navigation control must live in the shell header");
    const navigationRail = canvas.getByRole("complementary", { hidden: true });
    await expect(navigationRail).toHaveAttribute("aria-label", t("shell.navigation"));
    await expect(openNavigation).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByRole("dialog", { name: t("shell.brand") })).not.toBeInTheDocument();
    await expect(getComputedStyle(mobileHeader).backgroundColor).toBe(getComputedStyle(navigationRail).backgroundColor);
  }

  async function verifyAuthenticatedActions({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const account = canvas.getByRole("link", { name: "Maya Chen" });
    await expect(account).toHaveAttribute("title", t("shell.manageAccountFor", { name: "Maya Chen" }));
    // The initials avatar leads the name.
    await expect(account.textContent).toMatch(/MC\s*Maya Chen/);
    // The account platform's page opens in this tab.
    await expect(account).toHaveAttribute("href", "#account");
    await expect(account).not.toHaveAttribute("target");
    await expect(getComputedStyle(account).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await expect(getComputedStyle(account).borderTopWidth).toBe("0px");
    await expect(canvas.getByRole("button", { name: t("shell.logout") })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t("shell.signIn") })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("link", { name: t("shell.register") })).not.toBeInTheDocument();
  }

  async function verifyPrivacyDestination({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("link", { name: t("shell.privacy") })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("link", { name: t("shell.home") })).not.toHaveAttribute("aria-current");
  }

  async function verifyCollapsedAuthenticated({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const label = t("shell.manageAccountFor", { name: "Maya Chen" });
    await expect(canvas.getByRole("link", { name: label })).toHaveAttribute("title", label);
    // A logged-in visitor changes the telemetry answer from their account.
    await expect(canvas.queryByRole("link", { name: t("shell.privacy") })).not.toBeInTheDocument();
  }

  /** Checks that the open menu starts every label on one line, as the given ones. */
  async function verifyDrawerLabels(canvasElement: HTMLElement, globals: PlayContext["globals"], labels: string[]) {
    const t = createStorybookTranslator(globals);
    const navigation = within(canvasElement).getByRole("dialog", { name: t("shell.brand") });
    const labelStarts = labels.map((label) => within(navigation).getByText(label).getBoundingClientRect().left);
    await expect(Math.max(...labelStarts) - Math.min(...labelStarts)).toBeLessThanOrEqual(1);
  }

  async function verifyAnonymousMobileLayout({ canvasElement, globals }: PlayContext) {
    await verifyExpandedMobileNavigation({ canvasElement, globals });
    const t = createStorybookTranslator(globals);
    await verifyDrawerLabels(canvasElement, globals, [t("shell.home"), t("shell.signIn"), t("shell.register")]);
  }

  async function verifyAuthenticatedMobileLayout({ canvasElement, globals }: PlayContext) {
    await verifyExpandedMobileNavigation({ canvasElement, globals });
    const t = createStorybookTranslator(globals);
    await verifyDrawerLabels(canvasElement, globals, [t("shell.home"), "Maya Chen", t("shell.logout")]);
  }

  async function verifyPicture({ canvasElement }: PlayContext) {
    const account = within(canvasElement).getByRole("link", { name: "Moonlit Maya 🌊" });
    const picture = account.querySelector("img");
    await expect(picture?.getAttribute("src")).toBe(portraitPicture);
    await waitFor(() => expect(picture?.naturalWidth).toBe(256));
    // The picture replaces the initials.
    await expect(account.textContent).not.toContain("MC");
  }

  async function verifyUnnamedAccount({ canvasElement, globals }: PlayContext) {
    const t = createStorybookTranslator(globals);
    const account = within(canvasElement).getByRole("link", { name: t("shell.manageAccount") });
    await expect(within(account).getByText(t("shell.manageAccount"), { exact: true })).toBeVisible();
  }

  async function verifyLongAccountNameMobile({ canvasElement, globals }: PlayContext) {
    await verifyExpandedMobileNavigation({ canvasElement, globals });
    const t = createStorybookTranslator(globals);
    const navigation = within(canvasElement).getByRole("dialog", { name: t("shell.brand") });
    const accountName = within(navigation).getByText(longName);
    await expect(accountName.scrollWidth).toBeGreaterThan(accountName.clientWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  }

  async function verifyLoadingAccount({ canvasElement, globals }: PlayContext) {
    const t = createStorybookTranslator(globals);
    const rail = within(within(canvasElement).getByRole("complementary"));
    await expect(rail.getByRole("link", { name: t("shell.manageAccount") })).toHaveAttribute("href", "#account");
    await expect(rail.getByRole("button", { name: t("shell.logout") })).toBeEnabled();
    await expect(rail.queryByRole("alert")).not.toBeInTheDocument();
    await expect(rail.queryByRole("status")).not.toBeInTheDocument();
    await expect(rail.queryByRole("link", { name: t("shell.signIn") })).not.toBeInTheDocument();
  }

  async function verifyCollapsedLoadingAccount({ canvasElement, globals }: PlayContext) {
    const t = createStorybookTranslator(globals);
    const rail = within(within(canvasElement).getByRole("complementary"));
    await expect(rail.getByRole("link", { name: t("shell.manageAccount") })).toBeVisible();
  }
</script>

<Story
  name="Expanded anonymous — desktop"
  exportName="ExpandedAnonymousDesktop"
  globals={reviewStoryGlobals.desktop}
  asChild
  play={verifyAnonymousAuthentication}
>
  <StoryHarness model={anonymous} />
</Story>

<Story
  name="Expanded anonymous — mobile"
  exportName="ExpandedAnonymousMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyAnonymousMobileLayout}
>
  <StoryHarness model={withOpenMobileNavigation(anonymous)} collectsTelemetry />
</Story>

<Story name="Without account links" exportName="WithoutAccountLinks" asChild play={verifyWithoutAccountLinks}>
  <StoryHarness model={anonymous} accountLinks={false} />
</Story>

<Story name="Collapsed anonymous" asChild play={verifyCollapsedRail}>
  <StoryHarness model={{ ...anonymous, rail: "collapsed" }} />
</Story>

<Story
  name="Collapsed anonymous — mobile"
  exportName="CollapsedAnonymousMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyCollapsedMobileNavigation}
>
  <StoryHarness model={{ ...anonymous, rail: "collapsed" }} />
</Story>

<Story name="Authenticated" asChild play={verifyAuthenticatedActions}>
  <StoryHarness model={authenticated} />
</Story>

<Story name="Privacy destination" asChild play={verifyPrivacyDestination}>
  <StoryHarness model={{ ...anonymous, activeNavigation: "privacy" }} collectsTelemetry />
</Story>

<Story
  name="Authenticated — mobile"
  exportName="AuthenticatedMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyAuthenticatedMobileLayout}
>
  <StoryHarness model={withOpenMobileNavigation(authenticated)} />
</Story>

<Story name="Collapsed authenticated" asChild play={verifyCollapsedAuthenticated}>
  <StoryHarness model={{ ...authenticated, rail: "collapsed" }} collectsTelemetry />
</Story>

<Story name="Authenticated with a picture" exportName="AuthenticatedWithAPicture" asChild play={verifyPicture}>
  <StoryHarness model={withPicture} />
</Story>

<Story name="Collapsed with a picture" exportName="CollapsedWithAPicture" asChild>
  <StoryHarness model={{ ...withPicture, rail: "collapsed" }} />
</Story>

<Story
  name="Authenticated with a picture, mobile"
  exportName="AuthenticatedWithAPictureMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyExpandedMobileNavigation}
>
  <StoryHarness model={withOpenMobileNavigation(withPicture)} />
</Story>

<Story name="Account without a name" exportName="AccountWithoutAName" asChild play={verifyUnnamedAccount}>
  <StoryHarness model={unnamedAccount} />
</Story>

<Story name="Long account name" exportName="LongAccountName" asChild>
  <StoryHarness model={longAccountName} />
</Story>

<Story
  name="Long account name, mobile"
  exportName="LongAccountNameMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyLongAccountNameMobile}
>
  <StoryHarness model={withOpenMobileNavigation(longAccountName)} />
</Story>

<Story name="Loading account" asChild play={verifyLoadingAccount}>
  <StoryHarness model={loadingAccount} />
</Story>

<Story name="Collapsed loading account" asChild play={verifyCollapsedLoadingAccount}>
  <StoryHarness model={{ ...loadingAccount, rail: "collapsed" }} />
</Story>

<Story
  name="Loading account — mobile"
  exportName="LoadingAccountMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyExpandedMobileNavigation}
>
  <StoryHarness model={withOpenMobileNavigation(loadingAccount)} />
</Story>

<Story name="Maintenance" asChild>
  <StoryHarness model={anonymous} {downtime}><ScrollPreview /></StoryHarness>
</Story>

<Story name="Maintenance — mobile" exportName="MaintenanceMobile" globals={reviewStoryGlobals.mobile} asChild>
  <StoryHarness model={anonymous} {downtime}><ScrollPreview /></StoryHarness>
</Story>

<Story name="Maintenance with an account" asChild>
  <StoryHarness model={loadingAccount} {downtime}><ScrollPreview /></StoryHarness>
</Story>

<Story name="Upcoming maintenance" asChild>
  <StoryHarness model={anonymous} {downtime} started={false}><ScrollPreview /></StoryHarness>
</Story>
