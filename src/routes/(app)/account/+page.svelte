<script lang="ts">
  import { loginHref } from "#lib/application/auth/navigation.js";
  import PageTitle from "#lib/ui/PageTitle.svelte";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  import ProtectedPage from "../(access)/screen.svelte";
  import { createAccountScreenController } from "./controller.svelte";
  import Screen from "./screen.svelte";

  import { untrack } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  let { data } = $props();
  const { t } = getI18nContext();
  const controller = createAccountScreenController({
    model: untrack(() => data.accountModel),
    logoutAction: "?/logout",
  });

  $effect(() => {
    const model = data.accountModel;
    untrack(() => controller.synchronize(model));
  });

  const currentPath = $derived(page.url.pathname + page.url.search);
  const title = $derived(
    controller.state.model.claims.status === "error"
      ? t("pageTitles.withState", { title: t("pageTitles.account"), status: t("authUi.account.loadErrorTitle") })
      : t("pageTitles.account")
  );
</script>

<PageTitle {title} />

{#snippet account()}
  <Screen {controller} />
{/snippet}

<ProtectedPage
  loginHref={loginHref(currentPath)}
  homeHref={resolve("")}
  retryHref={currentPath}
  children={account}
  unavailable={account}
/>
