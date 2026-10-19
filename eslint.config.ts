import path from "node:path";

import { Eslint } from "@a-novel-kit/nodelib-config";

import { defineConfig } from "eslint/config";

export default defineConfig(
  ...Eslint({
    gitIgnorePath: path.join(import.meta.dirname, ".gitignore"),
    ignores: ["src/lib/i18n/generated/**"],
    storybook: true,
    // SvelteKit 3 keeps its options in vite.config.ts, so the parser gets an empty Svelte config.
    svelte: {},
  }),
  {
    rules: {
      // The shared preset allows {@html} for kit packages, which render only their own content. A
      // platform renders what its users write, so markup injection stays an error here.
      "svelte/no-at-html-tags": "error",
    },
  }
);
