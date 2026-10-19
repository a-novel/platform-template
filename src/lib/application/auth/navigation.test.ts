import { loginHref, safeReturnTo } from "./navigation";

import { describe, expect, it } from "vitest";

const returnTargets = [
  ["/account?panel=password#change", "/account?panel=password#change"],
  ["/account?query=two%20words", "/account?query=two+words"],
  ["/account?auth=login&returnTo=%2Faccount&panel=email", "/account?panel=email"],
  ["/account?/password&panel=email", "/account?panel=email"],
  ["/?auth=login&returnTo=%2F", "/"],
  ["https://attacker.invalid/account", "/"],
  ["//attacker.invalid/account", "/"],
  ["/%2fattacker.invalid", "/"],
  ["/%2e%2e//attacker.invalid", "/"],
  ["/%5cattacker.invalid", "/"],
  ["/%0d%0aLocation:evil", "/"],
  ["/%zz", "/"],
  ["javascript:alert(1)", "/"],
  [null, "/"],
];

describe("authentication navigation", () => {
  it.each(returnTargets)("sanitizes %s", (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });

  it("opens the existing modal with the safe target encoded once", () => {
    expect(loginHref("/account?panel=email")).toBe("/?auth=login&returnTo=%2Faccount%3Fpanel%3Demail");
  });
});
