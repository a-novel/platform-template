<script lang="ts">
  import {
    AccessForbiddenState,
    AccessUnavailableState,
    DowntimeState,
    Link,
    PageErrorState,
    PageNotFoundState,
    useMessages,
  } from "@a-novel-kit/uikit";

  let {
    status,
    homeHref,
    retryHref,
    downtime,
  }: {
    status: number;
    homeHref: string;
    retryHref: string;
    /** Set when a planned downtime stopped the services the page needs. */
    downtime?: { end: Date; timeZone: string };
  } = $props();
  // uikit ships the access and page states' copy; a name other than `t` keeps its keys out of the app's catalog.
  const uikitText = useMessages().t;
</script>

<!-- A page that needs a login shows nothing of its own: its load sends the visitor to the sign-in. -->
{#if downtime || status !== 401}
  <div class="error-page">
    {#if downtime}
      <DowntimeState end={downtime.end} timeZone={downtime.timeZone} headingLevel={1}>
        {#snippet actions()}
          <Link href={homeHref}>{uikitText("access.home")}</Link>
        {/snippet}
      </DowntimeState>
    {:else if status === 403}
      <AccessForbiddenState {homeHref} headingLevel={1} />
    {:else if status === 503}
      <AccessUnavailableState {retryHref} headingLevel={1} />
    {:else if status === 404}
      <PageNotFoundState {homeHref} headingLevel={1} />
    {:else}
      <PageErrorState {homeHref} headingLevel={1} />
    {/if}
  </div>
{/if}

<style>
  .error-page {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: var(--space-6);
    min-block-size: 100dvb;
  }
</style>
