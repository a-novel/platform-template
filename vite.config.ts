import manifest from "./package.json" with { type: "json" };

import { FaroSourceMaps } from "@a-novel-kit/nodelib-config/faro";
import { SvelteKitVite } from "@a-novel-kit/nodelib-config/sveltekit";
import { Yaml } from "@a-novel-kit/nodelib-config/yaml";

export default SvelteKitVite(
  {
    optimizeDeps: {
      include: ["@a-novel-kit/uikit", "@lucide/svelte"],
    },
    // A release build sends the browser's source maps to the platform's Faro app (a-novel/.github#517).
    plugins: [
      Yaml(),
      FaroSourceMaps({
        appName: "platform-template",
        endpoint: "https://faro-api-prod-eu-west-2.grafana.net/faro",
        stackId: 1896612,
      }),
    ],
  },
  // Deployments derive the origin from each request. A build for a known address, such as the
  // Playwright server, trusts ORIGIN instead.
  // The release version names the build, so browser telemetry reports which release it runs.
  // The browser reports to its Faro app's collector (a-novel/.github#527).
  {
    csp: { directives: { "connect-src": ["self", "https://faro-collector-prod-eu-west-2.grafana.net"] } },
    paths: { origin: process.env.ORIGIN },
    tracing: { server: true },
    version: { name: manifest.version },
  }
);
