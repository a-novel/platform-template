<script lang="ts">
  import PageTitle from "#lib/ui/PageTitle.svelte";

  import Screen from "./screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  const { t } = getI18nContext();
</script>

<PageTitle title={t("shell.homeTitle")} />

<Screen />
