<script module lang="ts">
  import type { ShellController } from "./controller.svelte";

  import type { Snippet } from "svelte";

  /** Props for the pure platform shell. */
  export interface ShellProps {
    controller: ShellController;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import agoraBanner from "@a-novel-kit/ui-images/files/banner/80h/agora-banner.png";
  import agoraIcon48 from "@a-novel-kit/ui-images/files/icon/48x48/agora-icon.png";
  import agoraIcon96 from "@a-novel-kit/ui-images/files/icon/96x96/agora-icon.png";
  import {
    Avatar,
    Button,
    type ButtonLinkProps,
    type ButtonProps,
    Dialog,
    DowntimeBanner,
    IconButton,
    NavList,
    Separator,
    ShellLayout,
    Skeleton,
    SkipLink,
    VisuallyHidden,
  } from "@a-novel-kit/uikit";

  import {
    CircleUserRound,
    House,
    LogIn,
    LogOut,
    type LucideIcon,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    ShieldCheck,
    UserRoundPlus,
    X,
  } from "@lucide/svelte";

  let { controller, children }: ShellProps = $props();

  const model = $derived(controller.state.model);
  const homeHref = $derived(controller.state.homeHref);
  const accountHref = $derived(controller.state.accountHref);
  const invitationHref = $derived(controller.state.invitationHref);
  const logoutAction = $derived(controller.state.logoutAction);
  const privacyHref = $derived(controller.state.privacyHref);
  const platformDowntime = $derived(controller.state.platformDowntime);

  const componentId = $props.id();
  const desktopNavigationId = `${componentId}-desktop-navigation`;
  const drawerId = `${componentId}-navigation-drawer`;
  const compactRail = $derived(model.rail === "collapsed");
  const { t } = getI18nContext();
  const authenticatedSession = $derived(model.session.status === "authenticated" ? model.session : null);

  function closeDrawerAfterNavigation(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest("a")) controller.navigationDialog.close();
  }

  /** Tells whether a click asks for another tab or window, which the browser opens from the link itself. */
  function opensElsewhere(event: MouseEvent): boolean {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  }

  /** Runs a shell transition in place of a plain link click. The link's own URL serves every other click. */
  function navigate(event: MouseEvent, transition: () => void) {
    if (event.defaultPrevented || opensElsewhere(event)) return;
    event.preventDefault();
    transition();
  }
</script>

{#snippet homeIcon()}<House size="var(--icon-size-sm)" />{/snippet}

{#snippet brand(compact: boolean)}
  <span class="brand" class:compact>
    {#if compact}
      <img
        class="brand-icon"
        src={agoraIcon48}
        srcset={`${agoraIcon48} 1x, ${agoraIcon96} 2x`}
        width="24"
        height="24"
        alt={t("shell.brand")}
      />
    {:else}
      <img class="brand-banner" src={agoraBanner} width="96" height="24" alt={t("shell.brand")} />
    {/if}
  </span>
{/snippet}

{#snippet navigationTitle()}
  {@render brand(false)}
{/snippet}

{#snippet primaryNavigation(compact: boolean, onNavigate?: (event: MouseEvent) => void)}
  <nav aria-label={t("shell.navigation")}>
    <NavList
      {compact}
      onclick={onNavigate}
      items={[
        {
          href: homeHref,
          label: t("shell.home"),
          current: model.activeNavigation === "home",
          icon: homeIcon,
        },
      ]}
    />
  </nav>
{/snippet}

<!-- An account control: its icon and label, or in the compact rail its icon alone, named by the label. -->
{#snippet accountButton(compact: boolean, label: string, Icon: LucideIcon, attributes: ButtonProps | ButtonLinkProps)}
  <Button
    class="shell-account-button {compact ? 'compact-control' : ''}"
    variant="ghost"
    tone="neutral"
    size="sm"
    square={compact}
    aria-label={compact ? label : undefined}
    title={compact ? label : undefined}
    {...attributes}
  >
    <span class="account-action-icon" aria-hidden="true">
      <Icon size="var(--icon-size-sm)" />
    </span>
    {#if !compact}<span>{label}</span>{/if}
  </Button>
{/snippet}

<!-- Links of one group touch. The account and the logout stand apart, so a click meant for one never lands
     on the other. -->
{#snippet accountWidget(compact: boolean)}
  <div class="account-widget" data-session={model.session.status}>
    {#if model.session.status !== "anonymous"}
      {#if accountHref}
        {@const name = authenticatedSession?.displayName}
        {@const label = name ? t("shell.manageAccountFor", { name }) : t("shell.manageAccount")}
        <!-- The account platform serves the account page, which opens in this tab like every other link, even
             while the account's details load. -->
        <Button
          class="shell-account-button {compact ? 'compact-control' : ''}"
          variant="ghost"
          tone="neutral"
          size="sm"
          square={compact}
          title={name || compact ? label : undefined}
          href={accountHref}
        >
          <span class="account-action-icon" class:account-picture={name || !authenticatedSession} aria-hidden="true">
            {#if !authenticatedSession}
              <Skeleton class="account-picture-skeleton" shape="rectangle" />
            {:else if name}
              <Avatar
                label={name}
                initials={authenticatedSession.initials}
                src={authenticatedSession.picture}
                size="sm"
                shape="square"
              />
            {:else}
              <CircleUserRound size="var(--icon-size-sm)" />
            {/if}
          </span>
          {#if authenticatedSession && !compact}
            <span class="account-label">{name ?? t("shell.manageAccount")}</span>
          {:else}
            <VisuallyHidden>{label}</VisuallyHidden>
            {#if !compact}<Skeleton class="account-label-skeleton" />{/if}
          {/if}
        </Button>
        <Separator decorative />
      {/if}
      <form class="logout-form" method="POST" action={logoutAction}>
        {@render accountButton(compact, t("shell.logout"), LogOut, { type: "submit" })}
      </form>
    {:else}
      <div class="link-group">
        <!-- The sign-in route redirects to the account platform, which the client router cannot render. -->
        {@render accountButton(compact, t("shell.signIn"), LogIn, {
          href: controller.signInHref(),
          "data-sveltekit-reload": true,
        })}
        {#if invitationHref}
          {@render accountButton(compact, t("shell.register"), UserRoundPlus, { href: invitationHref })}
        {/if}
        <!-- A logged-in visitor changes their telemetry answer from their account. -->
        {#if privacyHref}
          {@render accountButton(compact, t("shell.privacy"), ShieldCheck, {
            href: privacyHref,
            "aria-current": model.activeNavigation === "privacy" ? "page" : undefined,
          })}
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet downtimeBanner()}
  {#if platformDowntime?.downtime}
    <DowntimeBanner
      start={platformDowntime.downtime.start}
      end={platformDowntime.downtime.end}
      started={platformDowntime.started}
      timeZone={platformDowntime.timeZone}
    />
  {/if}
{/snippet}

<div class="shell-viewport">
  <SkipLink href="#main-content">{t("shell.skipToContent")}</SkipLink>

  <ShellLayout collapsed={compactRail} banner={platformDowntime?.downtime ? downtimeBanner : undefined}>
    {#snippet rail()}
      <aside class="rail" class:collapsed={compactRail} aria-label={t("shell.navigation")}>
        <div class="rail-header">
          {@render brand(compactRail)}
          <IconButton
            label={compactRail ? t("shell.expandNavigation") : t("shell.collapseNavigation")}
            variant="ghost"
            tone="neutral"
            size="sm"
            aria-controls={desktopNavigationId}
            aria-expanded={!compactRail}
            onclick={() => controller.toggleRail()}
          >
            {#if compactRail}
              <PanelLeftOpen size="var(--icon-size-sm)" aria-hidden="true" />
            {:else}
              <PanelLeftClose size="var(--icon-size-sm)" aria-hidden="true" />
            {/if}
          </IconButton>
        </div>

        <div class="rail-body">
          <div id={desktopNavigationId} class="rail-navigation">
            {@render primaryNavigation(compactRail)}
          </div>

          <div class="rail-account">
            {@render accountWidget(compactRail)}
          </div>
        </div>
      </aside>
    {/snippet}

    {#snippet header()}
      <header class="mobile-header">
        {@render brand(false)}
        <IconButton
          label={t("shell.openNavigation")}
          variant="ghost"
          tone="neutral"
          size="sm"
          aria-controls={drawerId}
          aria-expanded={controller.navigationDialog.state.open}
          href={controller.navigationHref(true)}
          onclick={(event: MouseEvent) => navigate(event, () => controller.navigationDialog.open())}
        >
          <Menu size="var(--icon-size-sm)" aria-hidden="true" />
        </IconButton>
      </header>
    {/snippet}

    <main id="main-content" class="main-content" tabindex="-1">
      {@render children?.()}
    </main>
  </ShellLayout>

  <Dialog id={drawerId} controller={controller.navigationDialog} title={navigationTitle} presentation="fullscreen">
    {#snippet headerActions()}
      <IconButton
        label={t("shell.closeNavigation")}
        variant="ghost"
        tone="neutral"
        size="sm"
        href={controller.navigationHref(false)}
        onclick={(event: MouseEvent) => navigate(event, () => controller.navigationDialog.close())}
      >
        <X size="var(--icon-size-sm)" aria-hidden="true" />
      </IconButton>
    {/snippet}
    <div class="drawer-content">
      <div class="drawer-navigation">{@render primaryNavigation(false, closeDrawerAfterNavigation)}</div>
      <div class="drawer-account">
        {@render accountWidget(false)}
      </div>
    </div>
  </Dialog>
</div>

<style>
  .shell-viewport {
    color: var(--color-text-primary);
  }

  .rail {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--space-4);
    min-block-size: 0;
  }

  .rail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-1);
    min-inline-size: 0;
  }

  .collapsed .rail-header {
    flex-direction: column;
    justify-content: center;
  }

  .brand {
    display: flex;
    align-items: center;
    padding-inline: var(--space-2);
    min-inline-size: 0;
  }

  .brand.compact {
    padding: var(--space-1);
  }

  .brand-banner,
  .brand-icon {
    display: block;
    flex: none;
    object-fit: contain;
  }

  .brand-banner {
    inline-size: calc(var(--control-height-sm) * 3);
    max-inline-size: 100%;
    block-size: var(--control-height-sm);
  }

  .brand-icon {
    inline-size: var(--icon-size-lg);
    block-size: var(--icon-size-lg);
  }

  /* The links above and the account below stay far apart, however long the links run: the links scroll. */
  .rail-body,
  .drawer-content {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: var(--space-8);
    min-inline-size: 0;
    min-block-size: 0;
  }

  .rail-navigation,
  .drawer-navigation {
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior-block: contain;
  }

  .rail-account,
  .drawer-account {
    min-inline-size: 0;
  }

  .account-widget {
    display: grid;
    gap: var(--space-2);
    min-inline-size: 0;
  }

  .link-group {
    display: grid;
    min-inline-size: 0;
  }

  .logout-form {
    margin: 0;
    min-inline-size: 0;
  }

  .account-action-icon {
    display: inline-flex;
    flex: none;
    justify-content: center;
    align-items: center;
    inline-size: var(--control-height-sm);
  }

  /* The picture stays muted until the pointer or the keyboard reaches its button. */
  .account-picture {
    filter: saturate(50%) brightness(75%);
    transition: filter var(--duration-fast) var(--easing-standard);
  }

  :global(.shell-account-button:is(:hover, :focus-visible)) .account-picture {
    filter: none;
  }

  .account-label {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-action-icon :global(.account-picture-skeleton) {
    inline-size: var(--control-height-sm);
    block-size: var(--control-height-sm);
    min-block-size: 0;
  }

  :global(.shell-account-button) > :global(.account-label-skeleton) {
    flex: 1;
    min-inline-size: 0;
  }

  :global(.shell-account-button) {
    max-inline-size: 100%;
  }

  /* Only the width goes: the shorthand would also reset the border's color, which the rail's compact
     buttons would then fade from, as an outline, each time it collapses. */
  :global(:is(a, button).shell-account-button:not(.compact-control)) {
    justify-content: flex-start;
    border-width: 0;
    padding: var(--space-2) var(--space-3);
    inline-size: 100%;
    overflow: hidden;
    text-align: start;
  }

  /* One control tall on narrow screens, where the shell shows it. */
  .mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }

  /* The skip link's target takes focus without a ring, so a click or a scrolling key never outlines the whole
     page; the next Tab reaches a control, which shows its own. */
  .main-content {
    outline: none;
    min-inline-size: 0;
  }
</style>
