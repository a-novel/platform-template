<!--
@component
Renders a protected page once access is allowed, and otherwise the access state that stops it. A visitor
who has not logged in finds the page locked under a dialog that leads to the login or back home.
-->
<script lang="ts">
  import type { Snippet } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { AuthorizationBoundary, Button, Dialog, type DialogController, Link, StatusState } from "@a-novel-kit/uikit";
  import type { AuthorizationController } from "@a-novel-kit/uikit/authorization";

  interface Props {
    /** Inherits the layout provider unless a fixed or custom decision is supplied. */
    controller?: AuthorizationController;
    /** Further restricts an allowed decision. It never grants access by itself. */
    when?: boolean;
    children?: Snippet;
    /** Content safe to display without verified account information. */
    unavailable?: Snippet;
    /** Local, sanitized destinations supplied by the route. */
    signInHref: string;
    homeHref: string;
    retryHref: string;
  }

  let { controller, when, children, unavailable, signInHref, homeHref, retryHref }: Props = $props();
  const { t } = getI18nContext();

  // The dialog stays open: closing it would only show the locked page, so it leads to the login or home.
  const locked: DialogController = { state: { open: true }, open: () => {}, close: () => {}, toggle: () => {} };
</script>

<AuthorizationBoundary {controller} {when}>
  {#snippet fallback(status)}
    {#if status === "unavailable" && unavailable}
      {@render unavailable()}
    {:else}
      <div class="access-page">
        {#if status === "pending"}
          <StatusState tone="loading" title={t("access.pending.title")} headingLevel={1} />
        {:else if status === "anonymous"}
          <Dialog
            controller={locked}
            title={t("access.anonymous.title")}
            description={t("access.anonymous.description")}
            size="sm"
            closeOnBackdrop={false}
          >
            {#snippet actions()}
              <Button href={homeHref} variant="text" tone="neutral">{t("access.home")}</Button>
              <!-- The sign-in route redirects to the account platform, which the client router cannot render. -->
              <Button href={signInHref} data-sveltekit-reload>{t("shell.signIn")}</Button>
            {/snippet}
          </Dialog>
        {:else if status === "forbidden"}
          <StatusState
            tone="error"
            title={t("access.forbidden.title")}
            description={t("access.forbidden.description")}
            headingLevel={1}
          >
            {#snippet actions()}
              <Link href={homeHref}>{t("access.home")}</Link>
            {/snippet}
          </StatusState>
        {:else}
          <StatusState
            tone="error"
            title={t("access.unavailable.title")}
            description={t("access.unavailable.description")}
            headingLevel={1}
          >
            {#snippet actions()}
              <Link href={retryHref} data-sveltekit-reload>{t("access.retry")}</Link>
            {/snippet}
          </StatusState>
        {/if}
      </div>
    {/if}
  {/snippet}
  {@render children?.()}
</AuthorizationBoundary>

<style>
  .access-page {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: var(--space-6);
    min-block-size: 100dvb;
  }
</style>
