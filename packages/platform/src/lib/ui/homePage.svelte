<script lang="ts">
  import { getTranslate } from "@tolgee/svelte";

  const { t } = getTranslate("template.common");
</script>

<p>{$t("welcome", "Hello World")}</p>
