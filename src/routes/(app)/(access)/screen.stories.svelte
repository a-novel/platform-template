<script module lang="ts">
  import Screen from "./screen.svelte";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Authentication/Protected pages",
    component: Screen,
    tags: ["!autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
      loginHref: "/?auth=login&returnTo=%2Faccount",
      homeHref: "/",
      retryHref: "/account",
    },
  });
</script>

<Story name="Checking access" args={{ controller: { state: { status: "pending" } } }} />
<Story name="Account required" args={{ controller: { state: { status: "anonymous" } } }} />
<Story name="Access denied" args={{ controller: { state: { status: "forbidden" } } }} />
<Story name="Service unavailable" args={{ controller: { state: { status: "unavailable" } } }} />
