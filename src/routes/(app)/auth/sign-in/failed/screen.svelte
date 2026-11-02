<!-- @component The signed-out page a sign-in that did not complete lands on, with a retry. -->
<script lang="ts">
  import type { SignInFailure } from "#lib/application/auth/navigation.js";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { Link, StatusState } from "@a-novel-kit/uikit";

  let {
    failure,
    retryHref,
  }: {
    failure: SignInFailure;
    /** Starts the sign-in again, toward the page the failed one would have returned to. */
    retryHref: string;
  } = $props();
  const { t } = getI18nContext();

  const description = $derived.by(() => {
    switch (failure) {
      case "rejected":
        return t("signInFailed.rejected");
      case "unavailable":
        return t("signInFailed.unavailable");
      case "rate-limited":
        return t("signInFailed.rateLimited");
    }
  });
</script>

<div class="sign-in-failed">
  <StatusState tone="error" title={t("signInFailed.title")} {description} headingLevel={1}>
    {#snippet actions()}
      <!-- The sign-in route redirects to the account platform, which the client router cannot render. -->
      <Link href={retryHref} data-sveltekit-reload>{t("signInFailed.retry")}</Link>
    {/snippet}
  </StatusState>
</div>

<style>
  .sign-in-failed {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: var(--space-6);
    min-block-size: 100svh;
  }
</style>
