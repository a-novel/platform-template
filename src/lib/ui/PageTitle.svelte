<script module lang="ts">
  /** Supplies the active dialog title without replacing the underlying route's title. */
  export const authenticationTitleContext = Symbol("authenticationTitle");
</script>

<script lang="ts">
  import { getContext } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  let { title }: { title: string } = $props();
  const authenticationTitle = getContext<(() => string | undefined) | undefined>(authenticationTitleContext);
  const { t } = getI18nContext();
</script>

<svelte:head>
  <title>{authenticationTitle?.() ?? title} — {t("pageTitles.brand")}</title>
</svelte:head>
