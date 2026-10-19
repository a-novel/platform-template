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

  const controller: AccountScreenController = {
    get state() {
      return { model: localizeClaimExpiries(structuredClone(initialModel)), logoutAction: "/storybook/account/logout" };
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
