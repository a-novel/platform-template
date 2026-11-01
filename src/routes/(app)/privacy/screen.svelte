<script lang="ts">
  import { getTelemetryPreference, hasTelemetryPreference } from "#lib/ui/telemetry-preference.js";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { Card, Container, PageHeader, Stack, Switch, type SwitchController } from "@a-novel-kit/uikit";

  const { t } = getI18nContext();

  // Only a platform that collects browser telemetry asks for consent, so only it has an answer to change.
  const telemetry = hasTelemetryPreference() ? getTelemetryPreference() : undefined;
  const telemetrySwitch: SwitchController = {
    get state() {
      return { checked: telemetry?.choice === "accepted" };
    },
    setChecked: (checked) => telemetry?.choose(checked ? "accepted" : "declined"),
    toggle: () => telemetry?.choose(telemetry.choice === "accepted" ? "declined" : "accepted"),
  };
</script>

<div class="privacy-screen">
  <Container size="sm" gutter={false}>
    <Stack gap="4">
      <PageHeader title={t("privacy.title")} description={t("privacy.description")} />

      <Card surface="raised">
        {#if telemetry}
          <Switch
            class="telemetry-setting"
            controller={telemetrySwitch}
            label={t("telemetryConsent.title")}
            description={t("telemetryConsent.message")}
            disabled={telemetry.pending}
          />
        {:else}
          <p>{t("privacy.noTelemetry")}</p>
        {/if}
      </Card>
    </Stack>
  </Container>
</div>

<style>
  .privacy-screen {
    padding-inline: var(--layout-gutter);
    padding-block: var(--space-6) var(--space-12);
  }

  .privacy-screen :global(.telemetry-setting) {
    display: flex;
  }

  p {
    margin: 0;
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
  }
</style>
