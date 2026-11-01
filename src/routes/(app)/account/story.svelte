<script module lang="ts">
  import type { AccountScreenModel } from "#lib/application/auth/types.js";

  /** Fixed-state Storybook harness around the pure account screen. */
  export interface AccountScreenStoryProps {
    /** Initial controller state rendered by the story. */
    initialModel: AccountScreenModel;
  }
</script>

<script lang="ts">
  import type { AccountScreenController } from "./controller.svelte";
  import AccountScreen from "./screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  let { initialModel }: AccountScreenStoryProps = $props();
  const i18n = getI18nContext();

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
