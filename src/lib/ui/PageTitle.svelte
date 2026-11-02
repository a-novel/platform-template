<script lang="ts">
  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  let { title }: { title: string } = $props();
  const { t } = getI18nContext();
</script>

<svelte:head>
  <title>{title} | {t("pageTitles.brand")}</title>
</svelte:head>
