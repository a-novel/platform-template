import path from "node:path";

import { EslintSvelte } from "@a-novel-kit/nodelib-config/eslint-svelte";

export default EslintSvelte({
  gitIgnorePath: path.join(import.meta.dirname, ".gitignore"),
  ignores: ["src/lib/i18n/generated/**"],
  storybook: true,
  // SvelteKit 3 keeps its options in vite.config.ts, so the parser gets an empty Svelte config.
  svelte: {},
});
