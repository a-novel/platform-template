import { createAccessTokenVerifier } from "../../src/lib/server/auth/access-token";
import { expect, test } from "./fixtures";

test("Authentication's access tokens verify against JSON keys' public keys", async ({ administrator }) => {
  const verify = createAccessTokenVerifier("http://127.0.0.1:14103");

  await expect(verify(administrator)).resolves.toMatchObject({ sub: "user-access", userID: expect.any(String) });
});
