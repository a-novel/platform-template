import manifest from "./package.json" with { type: "json" };

import { SvelteKitVite } from "@a-novel-kit/nodelib-config/sveltekit";
import { Yaml } from "@a-novel-kit/nodelib-config/yaml";

export default SvelteKitVite(
  {
    optimizeDeps: {
      include: ["@a-novel-kit/uikit", "@lucide/svelte"],
    },
    plugins: [Yaml()],
  },
  // Deployments derive the origin from each request. A build for a known address, such as the
  // Playwright server, trusts ORIGIN instead.
  // The release version names the build, so browser telemetry reports which release it runs.
  { paths: { origin: process.env.ORIGIN }, tracing: { server: true }, version: { name: manifest.version } }
);
