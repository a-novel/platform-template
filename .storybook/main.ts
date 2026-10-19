import { mergeConfig } from "vite";

import type { StorybookConfig } from "@storybook/sveltekit";

const config: StorybookConfig = {
  addons: ["@a-novel-kit/uikit-storybook"],
  framework: "@storybook/sveltekit",
  staticDirs: ["../static"],
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
  // Vite matches each specifier exactly, so a subpath needs its own entry, or the first story run
  // discovers it late and reloads the tests.
  viteFinal: (config) =>
    mergeConfig(config, {
      optimizeDeps: {
        include: ["@a-novel-kit/uikit-storybook", "@a-novel-kit/uikit-storybook/ScrollPreview.svelte"],
      },
    }),
};

export default config;
