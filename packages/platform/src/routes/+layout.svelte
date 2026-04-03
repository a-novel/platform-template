<script lang="ts">
  import { resolve } from "$app/paths";
  import { PUBLIC_AUTHENTICATION_PLATFORM_URL } from "$env/static/public";
  import { authenticationApi } from "$lib";
  import { loadTranslations } from "$lib/locales";

  import type { Snippet } from "svelte";

  import { SessionComponent, SessionUiComponent } from "@a-novel/package-authentication";
  import { NavAuthConnector } from "@a-novel/package-authentication/connectors";
  import { loadTranslations as loadPackageTranslations } from "@a-novel/package-authentication/locales";
  import agoraLogoDark from "@a-novel/uikit/assets/logos/integrated/agora (dark).png";
  import agoraLogoLight from "@a-novel/uikit/assets/logos/integrated/agora (light).png";
  import { TolgeeConfig } from "@a-novel/uikit/locales";
  import { DesignSystemComponent } from "@a-novel/uikit/ui";
  import { Image, NavBar } from "@a-novel/uikit/ui/components";
  import { NavSettings } from "@a-novel/uikit/ui/components/nav";

  import { TolgeeProvider } from "@tolgee/svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  loadTranslations(TolgeeConfig);
  loadPackageTranslations(TolgeeConfig);

  function onManageAccount() {
    window.open(`${PUBLIC_AUTHENTICATION_PLATFORM_URL}/manage-account`, "_blank");
  }
</script>

{#snippet homeButton()}
  <Image alt="Agora Logo" src={agoraLogoDark} lightModeSrc={agoraLogoLight} />
{/snippet}

<TolgeeProvider tolgee={TolgeeConfig}>
  <DesignSystemComponent theme="dark">
    <SessionComponent api={authenticationApi}>
      <NavBar homeLink={resolve("/")} {homeButton} nav={[]}>
        {#snippet actionsDesktop()}
          <NavAuthConnector {onManageAccount} api={authenticationApi} />
          <NavSettings />
        {/snippet}
        {#snippet actionsMobile()}
          <NavAuthConnector {onManageAccount} api={authenticationApi} mobile />
          <NavSettings mobile />
        {/snippet}
      </NavBar>
      <SessionUiComponent api={authenticationApi}>
        {@render children()}
      </SessionUiComponent>
    </SessionComponent>
  </DesignSystemComponent>
</TolgeeProvider>
