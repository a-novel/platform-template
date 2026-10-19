import { mergeConfig } from "vitest/config";

import { SvelteKitVitest } from "@a-novel-kit/nodelib-config/vitest-sveltekit";
import { Yaml } from "@a-novel-kit/nodelib-config/yaml";

export default mergeConfig(
  SvelteKitVitest({
    rootUrl: import.meta.url,
    vitePlugins: () => [
      Yaml(),
      {
        name: "validation-dependencies",
        config: () => ({ optimizeDeps: { include: ["@a-novel/service-authentication-rest", "zod"] } }),
      },
    ],
  }),
  {
    test: {
      coverage: {
        exclude: [
          "src/**/*.stories.{svelte,ts}",
          "src/**/story.svelte",
          "src/**/*.fixture.ts",
          "src/lib/i18n/storybook.ts",
        ],
      },
    },
  }
);
