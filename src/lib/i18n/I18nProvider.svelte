<script module lang="ts">
  import type { Locale } from "./config";

  import type { Snippet } from "svelte";

  /** Props for one locale-isolated translation scope. */
  export interface I18nProviderProps {
    children: Snippet;
    locale: Locale;
  }
</script>

<script lang="ts">
  import { createI18n } from "./instance";

  import { untrack } from "svelte";

  import { setI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";

  let { children, locale }: I18nProviderProps = $props();

  setI18nContext(createI18n(untrack(() => locale)));
</script>

{@render children()}
