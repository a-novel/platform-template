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
  import { getPlatformDowntime, hasPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import { hasTelemetryPreference } from "#lib/ui/telemetry-preference.js";

  import AuthenticationPanel from "./(authentication)/screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import agoraBanner from "@a-novel-kit/ui-images/files/banner/80h/agora-banner.png";
  import agoraIcon48 from "@a-novel-kit/ui-images/files/icon/48x48/agora-icon.png";
  import agoraIcon96 from "@a-novel-kit/ui-images/files/icon/96x96/agora-icon.png";
  import {
    Alert,
    Avatar,
    Button,
    Dialog,
    DowntimeBanner,
    DowntimeState,
    IconButton,
    InlineMessage,
    NavList,
    SkipLink,
  } from "@a-novel-kit/uikit";

  import { House, LogIn, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from "@lucide/svelte";

  let { controller, children }: ShellProps = $props();

  // Stories and tests render the shell without the app's downtime tracking.
  const platformDowntime = hasPlatformDowntime() ? getPlatformDowntime() : undefined;
  const stoppedUntil = $derived(platformDowntime?.started ? platformDowntime.downtime?.end : undefined);

  const model = $derived(controller.state.model);
  const homeHref = $derived(controller.state.homeHref);
  const accountHref = $derived(controller.state.accountHref);
  const logoutAction = $derived(controller.state.logoutAction);

  const componentId = $props.id();
  const desktopNavigationId = `${componentId}-desktop-navigation`;
  const drawerId = `${componentId}-navigation-drawer`;
  const authenticationId = `${componentId}-authentication`;
  const compactRail = $derived(model.rail === "collapsed");
  const { t } = getI18nContext();
  // Only a platform that collects browser telemetry asks for consent, so only it offers to change the answer.
  const privacyItems = $derived(
    hasTelemetryPreference()
      ? [
          {
            href: controller.state.privacyHref,
            label: t("shell.privacy"),
            current: model.activeNavigation === "privacy",
            icon: privacyIcon,
          },
        ]
      : []
  );
  const authenticatedSession = $derived(model.session.status === "authenticated" ? model.session : null);
  /** The account widget's notice while the session is loading, unavailable or stopped for maintenance. */
  const sessionNotice = $derived.by(() => {
    if (model.session.status === "loading") return { tone: "loading", message: t("shell.sessionLoading") } as const;
    if (model.session.status === "error") return { tone: "error", message: t("shell.sessionUnavailable") } as const;
    if (model.session.status === "downtime") return { tone: "warning", message: t("shell.sessionDowntime") } as const;
    return null;
  });

  function closeDrawerAfterNavigation(event: MouseEvent) {
    if (event.target instanceof Element && event.target.closest("a")) controller.navigationDialog.close();
  }

  function submitLogout(event: SubmitEvent) {
    if (!controller.logout()) event.preventDefault();
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

{#snippet privacyIcon()}<ShieldCheck size="var(--icon-size-sm)" />{/snippet}

{#snippet accountIcon()}
  {#if authenticatedSession}
    <Avatar label={authenticatedSession.displayName} initials={authenticatedSession.initials} size="sm" />
  {/if}
{/snippet}

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
        ...privacyItems,
      ]}
    />
  </nav>
{/snippet}

{#snippet accountWidget(compact: boolean)}
  <div class="account-widget" data-session={model.session.status}>
    {#if sessionNotice}
      {#if compact}
        <div class="compact-status" title={sessionNotice.message}>
          <InlineMessage tone={sessionNotice.tone} aria-label={sessionNotice.message} />
        </div>
      {:else}
        <!-- A title crowds the narrow rail, so the alert has none. -->
        <Alert tone={sessionNotice.tone}>{sessionNotice.message}</Alert>
      {/if}
    {:else if authenticatedSession}
      <NavList
        {compact}
        title={compact ? authenticatedSession.displayName : t("shell.manageAccount")}
        items={[
          {
            href: accountHref,
            label: compact
              ? t("shell.manageAccountFor", { name: authenticatedSession.displayName })
              : authenticatedSession.displayName,
            icon: accountIcon,
          },
        ]}
      />
      <form class="logout-form" method="POST" action={logoutAction} onsubmit={submitLogout}>
        <Button
          class="shell-account-button {compact ? 'compact-control' : ''}"
          type="submit"
          variant="ghost"
          tone="neutral"
          size="sm"
          square={compact}
          aria-label={compact ? t("shell.logout") : undefined}
          title={compact ? t("shell.logout") : undefined}
        >
          <span class="account-action-icon" aria-hidden="true">
            <LogOut size="var(--icon-size-sm)" />
          </span>
          {#if !compact}<span>{t("shell.logout")}</span>{/if}
        </Button>
      </form>
    {:else}
      <Button
        class="shell-account-button {compact ? 'compact-control' : ''}"
        variant="ghost"
        tone="neutral"
        size="sm"
        square={compact}
        aria-label={compact ? t("shell.signIn") : undefined}
        title={compact ? t("shell.signIn") : undefined}
        href={controller.authenticationHref("login")}
        onclick={(event: MouseEvent) => navigate(event, () => controller.openAuthentication("login"))}
      >
        <span class="account-action-icon" aria-hidden="true">
          <LogIn size="var(--icon-size-sm)" />
        </span>
        {#if !compact}<span>{t("shell.signIn")}</span>{/if}
      </Button>
    {/if}
  </div>
{/snippet}

<div class="shell-viewport">
  <SkipLink href="#main-content">{t("shell.skipToContent")}</SkipLink>

  <div class="shell" data-rail={model.rail}>
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

      <div id={desktopNavigationId} class="rail-navigation">
        {@render primaryNavigation(compactRail)}
      </div>

      <div class="rail-account">
        {@render accountWidget(compactRail)}
      </div>
    </aside>

    <div class="workspace">
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

      {#if platformDowntime?.downtime}
        <div class="downtime">
          <DowntimeBanner
            start={platformDowntime.downtime.start}
            end={platformDowntime.downtime.end}
            started={platformDowntime.started}
            timeZone={platformDowntime.timeZone}
          />
        </div>
      {/if}

      <main id="main-content" class="main-content" tabindex="-1">
        {@render children?.()}
      </main>
    </div>
  </div>

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

  <Dialog id={authenticationId} controller={controller.authenticationDialog} title={t("shell.auth.login.title")}>
    {#snippet headerActions()}
      <IconButton
        label={t("shell.closeAuthentication")}
        variant="ghost"
        tone="neutral"
        size="sm"
        href={controller.authenticationHref(null)}
        onclick={(event: MouseEvent) => navigate(event, () => controller.authenticationDialog.close())}
      >
        <X size="var(--icon-size-sm)" aria-hidden="true" />
      </IconButton>
    {/snippet}
    {#if stoppedUntil && model.authView}
      <DowntimeState end={stoppedUntil} timeZone={platformDowntime?.timeZone} headingLevel={3} />
    {:else if model.authView}
      <AuthenticationPanel controller={controller.authentication} />
    {/if}
  </Dialog>
</div>

<style>
  .shell-viewport {
    container: app-shell / inline-size;
    background: var(--color-surface-canvas);
    min-block-size: 100dvb;
    color: var(--color-text-primary);
  }

  .shell {
    --shell-rail-width: clamp(var(--layout-sidebar-min), var(--layout-sidebar), 18rem);

    display: grid;
    grid-template-columns: var(--shell-rail-width) minmax(0, 1fr);
    min-block-size: 100dvb;
  }

  .shell[data-rail="collapsed"] {
    --shell-rail-width: calc(var(--control-height-sm) + var(--space-4));
  }

  .rail {
    display: grid;
    position: sticky;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: var(--space-4);
    z-index: var(--layer-sticky);
    box-sizing: border-box;
    inset-block-start: 0;
    padding: var(--space-2);
    inline-size: var(--shell-rail-width);
    block-size: 100dvb;
    overflow: hidden;
  }

  .rail,
  .mobile-header {
    background: var(--color-surface-island-strong);
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

  .rail-navigation {
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

  .compact-status {
    display: grid;
    place-items: center;
    inline-size: var(--control-height-sm);
    block-size: var(--control-height-sm);
  }

  :global(.shell-account-button) {
    max-inline-size: 100%;
  }

  :global(:is(a, button).shell-account-button:not(.compact-control)) {
    justify-content: flex-start;
    border: 0;
    padding: var(--space-2) var(--space-3);
    inline-size: 100%;
    overflow: hidden;
    text-align: start;
  }

  /* A column, so the sticky header and banner can stay in view across the whole content. */
  .workspace {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    min-block-size: 100dvb;
  }

  /* The maintenance banner stays above the content while it scrolls. */
  .downtime {
    position: sticky;
    z-index: var(--layer-sticky);
    inset-block-start: 0;
  }

  .mobile-header {
    display: none;
  }

  .main-content {
    flex: 1;
    outline: none;
    min-inline-size: 0;
  }

  .main-content:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-focus-ring);
    outline-offset: calc(var(--focus-ring-offset) * -1);
  }

  .drawer-navigation {
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior-block: contain;
  }

  .drawer-content {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: var(--space-2);
    min-inline-size: 0;
    min-block-size: 0;
  }

  @container app-shell (max-width: 47.999rem) {
    .shell {
      grid-template-columns: minmax(0, 1fr);
    }

    .rail {
      display: none;
    }

    /* On narrow screens it waits at the bottom, away from where reading starts, and never covers the end. */
    .downtime {
      order: 1;
      inset-block-end: 0;
      inset-block-start: auto;
    }

    .mobile-header {
      display: flex;
      position: sticky;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
      z-index: var(--layer-sticky);
      inset-block-start: 0;
      padding: var(--space-4);
    }
  }

  @media (forced-colors: active) {
    .rail,
    .mobile-header {
      border: var(--border-width-thin) solid CanvasText;
    }
  }
</style>
