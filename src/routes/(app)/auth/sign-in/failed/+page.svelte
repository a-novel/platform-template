<script lang="ts">
  import { readSignInFailure, signInHref } from "#lib/application/auth/navigation.js";
  import PageTitle from "#lib/ui/PageTitle.svelte";
  import { page } from "$app/state";

  import Screen from "./screen.svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  const { t } = getI18nContext();
</script>

<PageTitle title={t("signInFailed.title")} />

<Screen
  failure={readSignInFailure(page.url.searchParams)}
  retryHref={signInHref(page.url.searchParams.get("returnTo") ?? "/")}
/>
