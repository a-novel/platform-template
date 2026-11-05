import { accountDisplayFromHandle } from "./account-display";

import { describe, expect, it } from "vitest";

const handles = [
  ["maya.chen", { displayName: "Maya Chen", initials: "MC" }],
  ["MAYA", { displayName: "Maya", initials: "M" }],
  ["sarah-jane.o_neil+template", { displayName: "Sarah Jane O Neil", initials: "SJ" }],
] as const;

describe("accountDisplayFromHandle", () => {
  it.each(handles)("derives a readable account label from the handle %s", (handle, expected) => {
    expect(accountDisplayFromHandle(handle)).toEqual(expected);
  });

  it("names the account by its username, keeping the handle's initials", () => {
    expect(accountDisplayFromHandle("maya.chen", "Moonlit Maya 🌊")).toEqual({
      displayName: "Moonlit Maya 🌊",
      initials: "MC",
    });
  });
});
