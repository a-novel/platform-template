<script lang="ts">
  import { pageTitle } from "$lib";
  import { HomePage } from "$lib/ui";
</script>

<svelte:head>
  <title>{pageTitle("Home")}</title>
</svelte:head>

<HomePage />
