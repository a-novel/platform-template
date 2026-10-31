<script module lang="ts">
  import type { AccountScreenModel } from "#lib/application/auth/types.js";

  import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

  /** Fixed-state Storybook harness around the pure account screen. */
  export interface AccountScreenStoryProps {
    /** Initial controller state rendered by the story. */
    initialModel: AccountScreenModel;
    /** The visitor's telemetry answer; the switch then changes it within the story. */
    telemetryChoice?: TelemetryChoice;
  }
</script>

<script lang="ts">
  import { setTelemetryPreference } from "#lib/ui/telemetry-preference.js";

  import type { AccountScreenController } from "./controller.svelte";
  import AccountScreen from "./screen.svelte";

  import { untrack } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  let { initialModel, telemetryChoice }: AccountScreenStoryProps = $props();
  const i18n = getI18nContext();

  // A platform that collects browser telemetry, so the account page offers the setting.
  let choice = $state(untrack(() => telemetryChoice));
  setTelemetryPreference({
    pending: false,
    get choice() {
      return choice;
    },
    choose: (next) => (choice = next),
  });

  function localizeDates(model: AccountScreenModel): AccountScreenModel {
    const formatter = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
    const localize = (value: string) => {
      const date = Date.parse(value);
      return Number.isNaN(date) ? value : formatter.format(date);
    };

    if (model.claims.status === "ready") {
      model.claims.accessExpiresAt = localize(model.claims.accessExpiresAt);
      model.claims.refreshExpiresAt = localize(model.claims.refreshExpiresAt);
    }
    if (model.credentials.status === "ready" && model.credentials.pendingEmail) {
      model.credentials.pendingEmail.expiresAt = localize(model.credentials.pendingEmail.expiresAt);
    }

    return model;
  }

  const model = $derived(localizeDates(structuredClone(initialModel)));
  const controller: AccountScreenController = {
    get state() {
      return { model, logoutAction: "/storybook/account/logout" };
    },
    synchronize: () => {},
    submitLogout: () => false,
  };
</script>

<div class="story-frame">
  <AccountScreen {controller} />
</div>

<style>
  .story-frame {
    background: var(--color-surface-canvas);
    inline-size: 100%;
    min-block-size: 100dvb;
  }
</style>
