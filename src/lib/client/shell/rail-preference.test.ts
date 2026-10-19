import { railPreferenceKey, readRailCollapsed, writeRailCollapsed } from "./rail-preference";

import { describe, expect, it, vi } from "vitest";

describe("rail preference", () => {
  it("defaults to expanded when storage is unavailable", () => {
    expect(readRailCollapsed()).toBe(false);
  });

  it("reads only the current version and explicit collapsed value", () => {
    expect(readRailCollapsed({ getItem: () => '{"version":1,"railCollapsed":true}' })).toBe(true);
    expect(readRailCollapsed({ getItem: () => '{"version":2,"railCollapsed":true}' })).toBe(false);
    expect(readRailCollapsed({ getItem: () => '{"version":1,"railCollapsed":false}' })).toBe(false);
  });

  it.each(["not-json", "null", "[]", '{"version":1}'])("ignores malformed preference %s", (value) => {
    expect(readRailCollapsed({ getItem: () => value })).toBe(false);
  });

  it("persists a versioned preference", () => {
    const setItem = vi.fn();

    expect(writeRailCollapsed({ setItem }, true)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(railPreferenceKey, '{"version":1,"railCollapsed":true}');
  });

  it("contains unavailable storage failures", () => {
    const getItem = vi.fn(() => {
      throw new Error("storage denied");
    });
    const setItem = vi.fn(() => {
      throw new Error("storage denied");
    });

    expect(readRailCollapsed({ getItem })).toBe(false);
    expect(writeRailCollapsed({ setItem }, true)).toBe(false);
  });
});
