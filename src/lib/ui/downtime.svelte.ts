import { createContext, onMount } from "svelte";

import type { Downtime } from "@a-novel-kit/nodelib-server";

/** The planned downtime that stops platform features, as the visitor's page shows it. */
export interface PlatformDowntime {
  /** The downtime, or null without one. */
  readonly downtime: Downtime | null;
  /** Whether it has started, which locks the affected features until operators clear it. */
  readonly started: boolean;
  /** The time zone of its times: UTC until hydration, then the visitor's own. */
  readonly timeZone: string;
}

/** Reads, installs and detects the downtime tracking that the root layout installs for every page. */
export const [getPlatformDowntime, setPlatformDowntime, hasPlatformDowntime] = createContext<PlatformDowntime>();

// setTimeout fires at once past this delay. A page left open that long picks the start up on reload.
const maxTimerDelay = 2 ** 31 - 1;

/**
 * Tracks the downtime a load returned. It flips to started when the start passes on the visitor's
 * clock, and shows times in the visitor's zone after hydration, so the server and the first render
 * agree. Call it during component initialization.
 */
export function createPlatformDowntime(
  load: () => { downtime: Downtime | null; downtimeStarted: boolean }
): PlatformDowntime {
  let reached = $state(false);
  let timeZone = $state("UTC");
  const started = $derived(load().downtimeStarted || reached);

  onMount(() => {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  $effect(() => {
    const start = load().downtime?.start;
    if (!start || started) return;

    const delay = start.getTime() - Date.now();
    if (delay > maxTimerDelay) return;

    const timer = setTimeout(() => (reached = true), delay);
    return () => clearTimeout(timer);
  });

  return {
    get downtime() {
      return load().downtime;
    },
    get started() {
      return started;
    },
    get timeZone() {
      return timeZone;
    },
  };
}
