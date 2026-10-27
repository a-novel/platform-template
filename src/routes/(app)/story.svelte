<script module lang="ts">
  import type { AuthenticationPanelModel } from "#lib/application/auth/types.js";
  import type { ShellViewModel } from "#lib/application/shell/types.js";

  import type { Snippet } from "svelte";

  /** Fixed-state Storybook harness around the pure shell. */
  export interface ShellStoryProps {
    initialModel: ShellViewModel;
    initialAuthenticationModel?: AuthenticationPanelModel;
    /** A started planned downtime, which the shell announces and locks the sign-in dialog for. */
    downtime?: { start: Date; end: Date };
    /** Content after the home page, such as filler to scroll past sticky elements. */
    children?: Snippet;
  }
</script>

<script lang="ts">
  import TelemetryConsent from "#lib/ui/TelemetryConsent.svelte";
  import { setPlatformDowntime } from "#lib/ui/downtime.svelte.js";
  import { setTelemetryConsent } from "#lib/ui/telemetry-consent.js";

  import HomeScreen from "./(home)/screen.svelte";
  import { type ShellController, readyAuthenticationModel } from "./controller.svelte";
  import Screen from "./screen.svelte";

  import { untrack } from "svelte";

  import { createConsentController } from "@a-novel-kit/uikit";

  let { initialModel, initialAuthenticationModel, downtime, children }: ShellStoryProps = $props();

  const startedDowntime = untrack(() => downtime);
  if (startedDowntime) {
    setPlatformDowntime({
      downtime: { components: ["service-authentication.database"], ...startedDowntime },
      started: true,
      timeZone: "UTC",
    });
  }

  // A platform that collects browser telemetry: Privacy choices reopens the consent request.
  const consent = createConsentController();
  setTelemetryConsent(consent);

  const controller: ShellController = {
    get state() {
      return { model: initialModel, homeHref: "#home", accountHref: "#account", logoutAction: "#logout" };
    },
    authentication: {
      get state() {
        return {
          model: initialAuthenticationModel ?? readyAuthenticationModel(initialModel.authView ?? "login"),
          action: "#auth",
        };
      },
      synchronize: () => {},
      submit: () => false,
    },
    navigationDialog: {
      get state() {
        return { open: initialModel.drawerOpen };
      },
      open: () => {},
      close: () => {},
      toggle: () => {},
    },
    authenticationDialog: {
      get state() {
        return { open: initialModel.authView !== null };
      },
      open: () => {},
      close: () => {},
      toggle: () => {},
    },
    openAuthentication: () => {},
    authenticationHref: (view) => `#${view ?? "home"}`,
    navigationHref: (open) => (open ? "#navigation" : "#home"),
    toggleRail: () => {},
    logout: () => false,
    synchronizeRoute: () => {},
    synchronizeRail: () => {},
  };
</script>

<div class="story-frame">
  <TelemetryConsent controller={consent} />
  <Screen {controller}>
    <HomeScreen />
    {@render children?.()}
  </Screen>
</div>

<style>
  .story-frame {
    inline-size: 100%;
    min-block-size: 100dvb;
  }
</style>
