<script lang="ts">
  import ProtectedPage from "./screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { DowntimeState, Link, StatusState } from "@a-novel-kit/uikit";

  let {
    status,
    loginHref,
    homeHref,
    retryHref,
    downtime,
  }: {
    status: number;
    loginHref: string;
    homeHref: string;
    retryHref: string;
    /** Set when a planned downtime stopped the services the page needs. */
    downtime?: { end: Date; timeZone: string };
  } = $props();
  const { t } = getI18nContext();
</script>

{#if downtime}
  <div class="error-page">
    <DowntimeState end={downtime.end} timeZone={downtime.timeZone} headingLevel={1}>
      {#snippet actions()}
        <Link href={homeHref}>{t("access.home")}</Link>
      {/snippet}
    </DowntimeState>
  </div>
{:else if status === 403 || status === 503}
  <ProtectedPage
    controller={{ state: { status: status === 403 ? "forbidden" : "unavailable" } }}
    {loginHref}
    {homeHref}
    {retryHref}
  />
{:else}
  <div class="error-page">
    <StatusState
      tone="error"
      title={status === 404 ? t("access.notFound.title") : t("access.error.title")}
      description={status === 404 ? t("access.notFound.description") : t("access.error.description")}
      headingLevel={1}
    >
      {#snippet actions()}
        <Link href={homeHref}>{t("access.home")}</Link>
      {/snippet}
    </StatusState>
  </div>
{/if}

<style>
  .error-page {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: var(--space-6);
    min-block-size: 100svh;
  }
</style>
