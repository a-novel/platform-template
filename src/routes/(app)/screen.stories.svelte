<script module lang="ts">
  import { validationFixture } from "#lib/application/auth/forms.fixture.js";
  import { validateLogin } from "#lib/application/auth/forms.js";
  import type { ShellViewModel } from "#lib/application/shell/types.js";
  import { createStorybookTranslator } from "#lib/i18n/storybook.js";

  import StoryHarness from "./story.svelte";

  import { reviewStoryGlobals } from "@a-novel-kit/uikit-storybook";
  import ScrollPreview from "@a-novel-kit/uikit-storybook/ScrollPreview.svelte";

  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { StoryContext } from "@storybook/sveltekit";
  import { expect, userEvent, within } from "storybook/test";

  const anonymous: ShellViewModel = {
    activeNavigation: "home",
    authView: null,
    drawerOpen: false,
    rail: "expanded",
    session: { status: "anonymous" },
  };
  const authenticated: ShellViewModel = {
    ...anonymous,
    session: {
      status: "authenticated",
      displayName: "Maya Chen",
      initials: "MC",
    },
  };
  const loadingAccount: ShellViewModel = {
    ...anonymous,
    session: { status: "loading" },
  };
  const accountError: ShellViewModel = {
    ...anonymous,
    session: { status: "error" },
  };
  const maintenance: ShellViewModel = {
    ...anonymous,
    session: { status: "downtime" },
  };
  // Fixed times keep every rendering identical.
  const downtime = { start: new Date("2026-10-12T06:00:00Z"), end: new Date("2026-10-12T08:30:00Z") };
  const longAccountName: ShellViewModel = {
    ...anonymous,
    session: {
      status: "authenticated",
      displayName: "Alexandrine de la Bibliothèque des Mondes Imaginaires",
      initials: "AB",
    },
  };

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

  function clearFocus() {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  async function verifyAnonymousAuthentication({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("link", { name: t("shell.home") })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("img", { name: t("shell.brand") })).toHaveAttribute("width", "96");

    const signIn = canvas.getByRole("link", { name: t("shell.signIn") });
    await userEvent.click(signIn);
    await expect(canvas.queryByRole("dialog", { name: t("shell.auth.login.title") })).not.toBeInTheDocument();
    clearFocus();
  }

  async function verifyRailToggle({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("img", { name: t("shell.brand") })).toHaveAttribute("width", "24");
    const toggle = canvas.getByRole("button", { name: t("shell.expandNavigation") });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    clearFocus();
  }

  async function verifyExpandedMobileNavigation({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const navigation = canvas.getByRole("dialog", { name: t("shell.brand") });
    await expect(navigation).toBeVisible();
    await expect(within(navigation).getByRole("img", { name: t("shell.brand") })).toHaveAttribute("width", "96");

    await userEvent.click(within(navigation).getByRole("link", { name: t("shell.closeNavigation") }));
    await expect(navigation).toBeVisible();
    clearFocus();
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

    await userEvent.click(openNavigation);
    await expect(canvas.queryByRole("dialog", { name: t("shell.brand") })).not.toBeInTheDocument();
    await expect(openNavigation).toHaveAttribute("aria-expanded", "false");
    clearFocus();
  }

  async function verifyAuthenticatedActions({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(canvas.getByRole("link", { name: "Maya Chen" })).toHaveAttribute("href", "#account");
    await expect(canvas.getByRole("button", { name: t("shell.logout") })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: t("shell.logout") }));
    await expect(canvas.getByRole("link", { name: "Maya Chen" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: t("shell.signIn") })).not.toBeInTheDocument();
    clearFocus();
  }

  async function verifyAuthenticatedMobileLayout({ canvasElement, globals }: PlayContext) {
    await verifyExpandedMobileNavigation({ canvasElement, globals });

    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    const navigation = canvas.getByRole("dialog", { name: t("shell.brand") });
    const labelStarts = [
      within(navigation).getByText(t("shell.home")).getBoundingClientRect().left,
      within(navigation).getByText("Maya Chen").getBoundingClientRect().left,
      within(navigation).getByText(t("shell.logout")).getBoundingClientRect().left,
    ];

    await expect(Math.max(...labelStarts) - Math.min(...labelStarts)).toBeLessThanOrEqual(1);
  }

  async function verifyValidationFeedback({ canvasElement }: PlayContext) {
    await expect(canvasElement.querySelectorAll('[aria-invalid="true"]')).toHaveLength(2);
    expect(canvasElement.querySelector('a[href$="-email"]')).toBeNull();
  }

  async function verifySubmittingIsLocked({ canvasElement, globals }: PlayContext) {
    const canvas = within(canvasElement);
    const t = createStorybookTranslator(globals);
    await expect(
      canvas.getByRole("button", { name: t("authUi.authentication.journeys.login.submitting") })
    ).toBeDisabled();
    await expect(canvas.getByRole("textbox", { name: t("authUi.authentication.emailLabel") })).toHaveAttribute(
      "readonly"
    );
  }
</script>

<Story
  name="Expanded anonymous — desktop"
  exportName="ExpandedAnonymousDesktop"
  globals={reviewStoryGlobals.desktop}
  asChild
  play={verifyAnonymousAuthentication}
>
  <StoryHarness initialModel={anonymous} />
</Story>

<Story
  name="Expanded anonymous — mobile"
  exportName="ExpandedAnonymousMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyExpandedMobileNavigation}
>
  <StoryHarness initialModel={withOpenMobileNavigation(anonymous)} />
</Story>

<Story name="Collapsed anonymous" asChild play={verifyRailToggle}>
  <StoryHarness initialModel={{ ...anonymous, rail: "collapsed" }} />
</Story>

<Story
  name="Collapsed anonymous — mobile"
  exportName="CollapsedAnonymousMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyCollapsedMobileNavigation}
>
  <StoryHarness initialModel={{ ...anonymous, rail: "collapsed" }} />
</Story>

<Story name="Authenticated" asChild play={verifyAuthenticatedActions}>
  <StoryHarness initialModel={authenticated} />
</Story>

<Story
  name="Authenticated — mobile"
  exportName="AuthenticatedMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyAuthenticatedMobileLayout}
>
  <StoryHarness initialModel={withOpenMobileNavigation(authenticated)} />
</Story>

<Story name="Loading account" asChild>
  <StoryHarness initialModel={loadingAccount} />
</Story>

<Story
  name="Loading account — mobile"
  exportName="LoadingAccountMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyExpandedMobileNavigation}
>
  <StoryHarness initialModel={withOpenMobileNavigation(loadingAccount)} />
</Story>

<Story name="Account error" asChild>
  <StoryHarness initialModel={accountError} />
</Story>

<Story
  name="Account error — mobile"
  exportName="AccountErrorMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyExpandedMobileNavigation}
>
  <StoryHarness initialModel={withOpenMobileNavigation(accountError)} />
</Story>

<Story name="Maintenance" asChild>
  <StoryHarness initialModel={maintenance} {downtime}><ScrollPreview /></StoryHarness>
</Story>

<Story name="Maintenance — mobile" exportName="MaintenanceMobile" globals={reviewStoryGlobals.mobile} asChild>
  <StoryHarness initialModel={maintenance} {downtime}><ScrollPreview /></StoryHarness>
</Story>

<Story name="Login modal during maintenance" asChild>
  <StoryHarness initialModel={{ ...maintenance, authView: "login" }} {downtime} />
</Story>

<Story name="Login modal — desktop" exportName="LoginModalDesktop" globals={reviewStoryGlobals.desktop} asChild>
  <StoryHarness initialModel={{ ...anonymous, authView: "login" }} />
</Story>

<Story name="Login modal — mobile" exportName="LoginModalMobile" globals={reviewStoryGlobals.mobile} asChild>
  <StoryHarness initialModel={{ ...anonymous, authView: "login" }} />
</Story>

<Story name="Login submitting" asChild play={verifySubmittingIsLocked}>
  <StoryHarness
    initialModel={{ ...anonymous, authView: "login" }}
    initialAuthenticationModel={{ journey: "login", state: { status: "submitting" } }}
  />
</Story>

<Story name="Login validation error" asChild play={verifyValidationFeedback}>
  <StoryHarness
    initialModel={{ ...anonymous, authView: "login" }}
    initialAuthenticationModel={{
      journey: "login",
      state: validationFixture(validateLogin, { email: "not-an-email", password: "" }),
    }}
  />
</Story>

<Story name="Login service error" asChild>
  <StoryHarness
    initialModel={{ ...anonymous, authView: "login" }}
    initialAuthenticationModel={{
      journey: "login",
      state: {
        status: "service-error",
        feedback: "invalidCredentials",
      },
    }}
  />
</Story>

<Story name="Login service unavailable" asChild>
  <StoryHarness
    initialModel={{ ...anonymous, authView: "login" }}
    initialAuthenticationModel={{
      journey: "login",
      state: {
        status: "service-error",
        feedback: "serviceUnavailable",
      },
    }}
  />
</Story>

<Story name="Login too many attempts" asChild>
  <StoryHarness
    initialModel={{ ...anonymous, authView: "login" }}
    initialAuthenticationModel={{
      journey: "login",
      state: { status: "service-error", feedback: "tooManyAttempts" },
    }}
  />
</Story>

<Story name="Long account name" asChild>
  <StoryHarness initialModel={longAccountName} />
</Story>

<Story
  name="Long account name — mobile"
  exportName="LongAccountNameMobile"
  globals={reviewStoryGlobals.mobile}
  asChild
  play={verifyExpandedMobileNavigation}
>
  <StoryHarness initialModel={withOpenMobileNavigation(longAccountName)} />
</Story>
