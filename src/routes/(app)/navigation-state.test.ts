import { readNavigationOpen, withNavigationOpen } from "./navigation-state";

import { describe, expect, it } from "vitest";

describe("navigation URL state", () => {
  it("round-trips mobile navigation without losing route, return destination or fragment", () => {
    const source = new URL("https://template.example.test/base/?returnTo=%2Faccount#details");
    const open = withNavigationOpen(source, true);
    expect(readNavigationOpen(open.searchParams)).toBe(true);
    expect(withNavigationOpen(open, false).href).toBe(source.href);
    expect(source.searchParams.has("menu")).toBe(false);
  });

  it.each(["", "closed", "open&menu=open"])("rejects invalid menu state %s", (query) => {
    expect(readNavigationOpen(new URLSearchParams(`menu=${query}`))).toBe(false);
  });
});
