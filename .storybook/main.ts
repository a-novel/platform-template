import { mergeConfig } from "vite";

import type { StorybookConfig } from "@storybook/sveltekit";

const config: StorybookConfig = {
  addons: ["@a-novel-kit/uikit-storybook"],
  framework: "@storybook/sveltekit",
  staticDirs: ["../static"],
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
  // Vite matches each specifier exactly, so each subpath needs its own entry. Vite optimizes an
  // unlisted one mid-run, which reloads the tests.
  viteFinal: (config) =>
    mergeConfig(config, {
      optimizeDeps: {
        include: ["@a-novel-kit/uikit-storybook", "@a-novel-kit/uikit-storybook/ScrollPreview.svelte"],
      },
    }),
};

export default config;
