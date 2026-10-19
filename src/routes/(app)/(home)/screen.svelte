<script lang="ts">
  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  const { t } = getI18nContext();
</script>

<h1>{t("shell.homeTitle")}</h1>

<style>
  h1 {
    position: absolute;
    clip-path: inset(50%);
    margin: 0;
    border: 0;
    padding: 0;
    inline-size: var(--border-width-thin);
    block-size: var(--border-width-thin);
    overflow: hidden;
    white-space: nowrap;
  }
</style>
