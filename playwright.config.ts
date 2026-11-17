import { profileServiceTokenPath, serviceTokenPath } from "./tests/e2e/service-token";

import { SvelteKitPlaywright } from "@a-novel-kit/nodelib-config/playwright";
import { downtimeServers } from "@a-novel-kit/nodelib-test/playwright";

import { defineConfig } from "playwright/test";

export default defineConfig({
  // One build, served once per planned downtime state.
  ...SvelteKitPlaywright({
    servers: downtimeServers(),
    serverEnvironment: {
      ACCOUNT_URL: "http://127.0.0.1:14102",
      AUTHENTICATION_SERVICE_URL: "http://127.0.0.1:14100",
      JSON_KEYS_SERVICE_URL: "http://127.0.0.1:14103",
      PROFILE_SERVICE_TOKEN_PATH: profileServiceTokenPath,
      PROFILE_SERVICE_URL: "http://127.0.0.1:14104",
      SERVICE_TOKEN_PATH: serviceTokenPath,
    },
    // The account platform's image serves plain HTTP here, as a load balancer that ends TLS would.
    use: { extraHTTPHeaders: { "X-Forwarded-Proto": "http" } },
  }),
  globalSetup: ["./tests/e2e/setup.ts", "./tests/e2e/service-token.ts", "./tests/e2e/downtime.ts"],
  // The outage journey briefly stops the shared, disposable authentication service.
  workers: 1,
});
