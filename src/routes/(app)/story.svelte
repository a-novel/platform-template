<script module lang="ts">
  import type { ShellViewModel } from "./controller.svelte";

  import type { Snippet } from "svelte";

  /** Fixed-state Storybook harness around the pure shell. */
  export interface ShellStoryProps {
    model: ShellViewModel;
    /** Whether the platform collects browser telemetry, which adds the Privacy destination. */
    collectsTelemetry?: boolean;
    /** Whether the server could read where the account platform lives, which its links need. */
    accountLinks?: boolean;
    /** A planned downtime, which the shell announces. */
    downtime?: { start: Date; end: Date };
    /** Whether that downtime has started. */
    started?: boolean;
    /** Content after the home page, such as filler to scroll past sticky elements. */
    children?: Snippet;
  }
</script>

<script lang="ts">
  import HomeScreen from "./(home)/screen.svelte";
  import type { ShellController } from "./controller.svelte";
  import Screen from "./screen.svelte";

  let { model, collectsTelemetry, accountLinks = true, downtime, started = true, children }: ShellStoryProps = $props();

  const controller: ShellController = {
    get state() {
      return {
        model,
        homeHref: "#home",
        accountHref: accountLinks ? "#account" : null,
        invitationHref: accountLinks ? "#invitation" : null,
        privacyHref: collectsTelemetry ? "#privacy" : null,
        logoutAction: "#logout",
        platformDowntime: downtime && {
          downtime: { components: ["service-authentication.database"], ...downtime },
          started,
          timeZone: "UTC",
        },
      };
    },
    navigationDialog: {
      get state() {
        return { open: model.drawerOpen };
      },
      open: () => {},
      close: () => {},
      toggle: () => {},
    },
    navigationHref: (open) => (open ? "#navigation" : "#home"),
    signInHref: () => "#sign-in",
    toggleRail: () => {},
    logout: () => false,
    synchronizeRoute: () => {},
    synchronizeRail: () => {},
  };
</script>

<div class="story-frame">
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
