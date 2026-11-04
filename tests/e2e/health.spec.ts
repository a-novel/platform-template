import { expect, test } from "./fixtures";

test("the readiness probe reaches the running services", async ({ request }) => {
  const response = await request.get("/healthcheck");

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    services: { authentication: { status: "up" }, jsonKeys: { status: "up" } },
    status: "up",
  });
});
