<script lang="ts">
  import type { Snippet } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { AuthorizationBoundary, Link, StatusState } from "@a-novel-kit/uikit";
  import type { AuthorizationController } from "@a-novel-kit/uikit/authorization";

  interface Props {
    /** Inherits the layout provider unless a fixed or custom decision is supplied. */
    controller?: AuthorizationController;
    /** Further restricts an allowed decision; never grants access by itself. */
    when?: boolean;
    children?: Snippet;
    /** Only for content safe to display without verified account information. */
    unavailable?: Snippet;
    /** Local, sanitized destinations supplied by the route. */
    loginHref: string;
    homeHref: string;
    retryHref: string;
  }

  let { controller, when, children, unavailable, loginHref, homeHref, retryHref }: Props = $props();
  const { t } = getI18nContext();
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
          <StatusState
            title={t("access.anonymous.title")}
            description={t("access.anonymous.description")}
            headingLevel={1}
          >
            {#snippet actions()}
              <Link href={loginHref}>{t("shell.signIn")}</Link>
            {/snippet}
          </StatusState>
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
    min-block-size: 100svh;
  }
</style>
