<script module lang="ts">
  import ErrorPage from "./error-screen.svelte";

  import { defineMeta } from "@storybook/addon-svelte-csf";

  const { Story } = defineMeta({
    title: "Authentication/Error pages",
    component: ErrorPage,
    tags: ["!autodocs"],
    parameters: { layout: "fullscreen" },
    args: {
      status: 503,
      signInHref: "/auth/sign-in?returnTo=%2Faccount",
      homeHref: "/",
      retryHref: "/account",
    },
  });
</script>

<Story name="Maintenance" args={{ downtime: { end: new Date("2026-10-12T08:30:00Z"), timeZone: "UTC" } }} />
<Story name="Page not found" args={{ status: 404 }} />
