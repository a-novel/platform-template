import {
  normalizeAuthUrl,
  readAuthView,
  readNavigationOpen,
  withAuthView,
  withNavigationOpen,
} from "./auth-dialog-state";

import { describe, expect, it } from "vitest";

describe("authentication URL state", () => {
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

  it("leaves valid login return parameters in their original order", () => {
    const source = new URL("https://template.example.test/?auth=login&returnTo=%2Faccount%3Fpanel%3Demail");
    expect(normalizeAuthUrl(source).href).toBe(source.href);
  });

  it("round-trips the login view", () => {
    const source = new URL("https://template.example.test/work?document=42#selection");
    const encoded = withAuthView(source, "login");

    expect(readAuthView(encoded.searchParams)).toBe("login");
    expect(encoded.searchParams.get("document")).toBe("42");
    expect(encoded.hash).toBe("#selection");
    expect(source.searchParams.has("auth")).toBe(false);
  });

  it("removes authentication state without changing unrelated parameters", () => {
    const source = new URL("https://template.example.test/?auth=login&panel=outline");

    expect(withAuthView(source, null).href).toBe("https://template.example.test/?panel=outline");
  });

  it.each(["unknown", "", "login&auth=register"])("normalizes invalid state %s to closed", (query) => {
    const source = new URL(`https://template.example.test/?keep=yes&auth=${query}`);
    const normalized = normalizeAuthUrl(source);

    expect(readAuthView(source.searchParams)).toBeNull();
    expect(normalized.href).toBe("https://template.example.test/?keep=yes");
  });
});
