import { expect, test } from "./fixtures";

test("the readiness probe reaches the running authentication service", async ({ request }) => {
  const response = await request.get("/healthcheck");

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ services: { authentication: { status: "up" } }, status: "up" });
});
