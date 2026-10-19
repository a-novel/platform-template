<script module lang="ts">
  import Failure from "./failure.svelte";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Authentication/Error pages",
    component: Failure,
    tags: ["!autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
      status: 503,
      loginHref: "/?auth=login&returnTo=%2Faccount",
      homeHref: "/",
      retryHref: "/account",
    },
  });
</script>

<Story name="Maintenance" args={{ downtime: { end: new Date("2026-10-12T08:30:00Z"), timeZone: "UTC" } }} />
<Story name="Page not found" args={{ status: 404 }} />
