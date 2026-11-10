import { type RetryBackoffOptions, retryWithBackoff } from "@a-novel-kit/nodelib-browser/utils";

/**
 * Asks for missing data again while `missing` holds, for as long as the calling component lives. The
 * defaults suit data the page cannot do without, which shows a skeleton and retries for good. A list
 * passes `maxRetries` and `onExhausted`, and shows its error once they run out. Call it during
 * component initialization.
 */
export function retryWhile(
  missing: () => boolean,
  attempt: () => Promise<unknown>,
  options?: RetryBackoffOptions
): void {
  // Each load replaces the data `missing` reads. A derived value keeps a load that changed nothing from restarting the backoff.
  const active = $derived(missing());

  $effect(() => {
    if (!active) return;
    return retryWithBackoff(attempt, options);
  });
}
