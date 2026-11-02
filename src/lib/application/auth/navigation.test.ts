import { safeReturnTo, signInHref } from "./navigation";

import { describe, expect, it } from "vitest";

const returnTargets = [
  ["/account?panel=password#change", "/account?panel=password#change"],
  ["/account?query=two%20words", "/account?query=two+words"],
  ["/account?returnTo=%2Faccount&panel=email", "/account?panel=email"],
  ["/account?/password&panel=email", "/account?panel=email"],
  ["/?returnTo=%2F", "/"],
  ["/auth/sign-in?returnTo=%2Fprivacy", "/"],
  ["/auth/callback?code=private", "/"],
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

  it("starts a sign-in with the safe target encoded once", () => {
    expect(signInHref("/privacy?panel=email")).toBe("/auth/sign-in?returnTo=%2Fprivacy%3Fpanel%3Demail");
    expect(signInHref("https://attacker.invalid")).toBe("/auth/sign-in?returnTo=%2F");
  });
});
