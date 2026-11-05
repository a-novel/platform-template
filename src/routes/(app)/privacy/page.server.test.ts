import { load as loadPrivacy } from "./+page.server";

import { describe, expect, it } from "vitest";

type PrivacyEvent = Parameters<typeof loadPrivacy>[0];
type ParentData = Awaited<ReturnType<PrivacyEvent["parent"]>>;

function event(parent: Partial<ParentData>): PrivacyEvent {
  return { parent: async () => parent } as unknown as PrivacyEvent;
}

describe("public privacy page", () => {
  it("sends a logged-in visitor to the account's privacy tab", async () => {
    const parent = { session: { status: "authenticated" }, accountHref: "https://account.test/account" } as const;

    await expect(loadPrivacy(event(parent))).rejects.toMatchObject({
      status: 307,
      location: "https://account.test/account/privacy",
    });
  });

  it.each([
    ["a logged-out visitor", { session: { status: "anonymous" }, accountHref: "https://account.test/account" }],
    [
      "a visitor whose session cannot be checked",
      { session: { status: "error" }, accountHref: "https://account.test/account" },
    ],
    ["a server without the account platform's address", { session: { status: "authenticated" }, accountHref: null }],
  ] as const)("shows the public page to %s", async (_, parent) => {
    await expect(loadPrivacy(event(parent))).resolves.toBeUndefined();
  });
});
