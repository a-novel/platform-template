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

  function localizeClaimExpiries(model: AccountScreenModel): AccountScreenModel {
    if (model.claims.status !== "ready") return model;

    const formatter = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    });
    for (const key of ["accessExpiresAt", "refreshExpiresAt"] as const) {
      const expiry = Date.parse(model.claims[key]);
      if (!Number.isNaN(expiry)) model.claims[key] = formatter.format(expiry);
    }

    return model;
  }

  const model = $derived(localizeClaimExpiries(structuredClone(initialModel)));
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
