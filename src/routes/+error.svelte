<script lang="ts">
  import { errorPageTitle } from "#lib/i18n/page-titles.js";
  import PageTitle from "#lib/ui/PageTitle.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  import Screen from "./error-screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { getPlatformDowntime } from "@a-novel-kit/nodelib-svelte";

  const { t } = getI18nContext();
  const platformDowntime = getPlatformDowntime();
  const downtime = $derived(
    page.error?.downtime && platformDowntime.downtime
      ? { end: platformDowntime.downtime.end, timeZone: platformDowntime.timeZone }
      : undefined
  );
  const currentPath = $derived(page.url.pathname + page.url.search);
</script>

<PageTitle title={errorPageTitle(t, page.status, downtime !== undefined)} />

<Screen status={page.status} homeHref={resolve("")} retryHref={currentPath} {downtime} />
