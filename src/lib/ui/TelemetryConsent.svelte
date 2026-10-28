<!--
@component
Asks the visitor whether their browser may send error and performance reports, in the platform's
words. The controller records the answer.
-->
<script lang="ts">
  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { ConsentBanner, type ConsentController } from "@a-novel-kit/uikit";

  let { controller }: { controller: ConsentController } = $props();

  const { t } = getI18nContext();
</script>

<ConsentBanner {controller} title={t("telemetryConsent.title")}>
  {t("telemetryConsent.message")}
  {t("telemetryConsent.change")}
</ConsentBanner>
