import { type RetryBackoffOptions, retryWithBackoff } from "@a-novel-kit/nodelib-browser/utils";

/**
 * Asks for missing data again while `missing` holds, for as long as the calling component lives. The
 * defaults suit data the page cannot do without, which shows a skeleton and retries for good. A list
 * passes `maxRetries`, and shows its error once `exhausted` reads true. Call it during component
 * initialization.
 */
export function retryWhile(
  missing: () => boolean,
  attempt: () => Promise<unknown>,
  options?: Omit<RetryBackoffOptions, "signal">
): { readonly exhausted: boolean } {
  // Each load replaces the data `missing` reads. A derived value keeps a load that changed nothing from restarting the backoff.
  const active = $derived(missing());
  let exhausted = $state(false);

  $effect(() => {
    if (!active) return;

    exhausted = false;
    const owner = new AbortController();
    void retryWithBackoff(attempt, { ...options, signal: owner.signal }).then(() => {
      exhausted = !owner.signal.aborted;
    });

    return () => owner.abort();
  });

  return {
    get exhausted() {
      return exhausted;
    },
  };
}
