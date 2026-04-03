<script context="module" lang="ts">
  import { HomePage } from "@a-novel/platform-template/ui";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Platform/Pages/Home",
    component: HomePage,
    tags: ["autodocs"],
  });
</script>

{#snippet default_()}
  <HomePage />
{/snippet}

<Story name="Default" template={default_} />
