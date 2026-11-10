import { retryWhile } from "./retry.svelte";

import { flushSync } from "svelte";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("retryWhile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps its backoff across loads that changed nothing, and stops once the data arrives", async () => {
    let data = $state({ missing: true });
    const attempt = vi.fn(async () => {});
    const destroy = $effect.root(() => void retryWhile(() => data.missing, attempt));
    flushSync();

    await vi.advanceTimersByTimeAsync(250);
    expect(attempt).toHaveBeenCalledTimes(1);

    data = { missing: true };
    flushSync();
    await vi.advanceTimersByTimeAsync(499);
    expect(attempt).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(attempt).toHaveBeenCalledTimes(2);

    data = { missing: false };
    flushSync();
    expect(vi.getTimerCount()).toBe(0);

    destroy();
  });

  it("restarts from the first delay when the data goes missing again", async () => {
    let missing = $state(true);
    const attempt = vi.fn(async () => {});
    const destroy = $effect.root(() => void retryWhile(() => missing, attempt));
    flushSync();
    await vi.advanceTimersByTimeAsync(250 + 500);

    missing = false;
    flushSync();
    missing = true;
    flushSync();
    attempt.mockClear();

    await vi.advanceTimersByTimeAsync(250);
    expect(attempt).toHaveBeenCalledTimes(1);

    destroy();
  });

  it("reads as exhausted once a bounded run spends its retries, until it runs again", async () => {
    let missing = $state(true);
    let retries: ReturnType<typeof retryWhile> | undefined;
    const destroy = $effect.root(() => {
      retries = retryWhile(
        () => missing,
        async () => {},
        { maxRetries: 2 }
      );
    });
    flushSync();

    await vi.advanceTimersByTimeAsync(250);
    expect(retries?.exhausted).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(retries?.exhausted).toBe(true);

    missing = false;
    flushSync();
    missing = true;
    flushSync();
    expect(retries?.exhausted).toBe(false);

    destroy();
  });

  it("leaves no timer once its owner is gone", () => {
    const destroy = $effect.root(
      () =>
        void retryWhile(
          () => true,
          async () => {}
        )
    );
    flushSync();
    expect(vi.getTimerCount()).toBe(1);

    destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
