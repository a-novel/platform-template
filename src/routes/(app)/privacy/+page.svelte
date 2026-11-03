<script lang="ts">
  import PageTitle from "#lib/ui/PageTitle.svelte";
  import { getTelemetryPreference, hasTelemetryPreference } from "#lib/ui/telemetry-preference.js";

  import Screen from "./screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  const { t } = getI18nContext();
  // Only a platform that collects browser telemetry asks for consent, so only it has an answer to change.
  const telemetry = hasTelemetryPreference() ? getTelemetryPreference() : null;
</script>

<PageTitle title={t("pageTitles.privacy")} />

<Screen {telemetry} />
