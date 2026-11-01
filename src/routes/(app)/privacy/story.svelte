<script module lang="ts">
  import type { TelemetryChoice } from "@a-novel-kit/nodelib-browser/telemetry";

  /** Storybook harness around the pure privacy screen. */
  export interface PrivacyScreenStoryProps {
    /** Whether the platform collects browser telemetry, which installs the preference the screen changes. */
    collects?: boolean;
    /** The visitor's telemetry answer; the switch then changes it within the story. */
    telemetryChoice?: TelemetryChoice;
  }
</script>

<script lang="ts">
  import { setTelemetryPreference } from "#lib/ui/telemetry-preference.js";

  import PrivacyScreen from "./screen.svelte";

  import { untrack } from "svelte";

  let { collects = true, telemetryChoice }: PrivacyScreenStoryProps = $props();

  let choice = $state(untrack(() => telemetryChoice));
  if (untrack(() => collects)) {
    setTelemetryPreference({
      pending: false,
      get choice() {
        return choice;
      },
      choose: (next) => (choice = next),
    });
  }
</script>

<PrivacyScreen />
