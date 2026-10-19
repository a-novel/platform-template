<script module lang="ts">
  import type { AuthenticationPanelController } from "./controller.svelte";

  /** Props for the pure form rendered inside the shell authentication dialog. */
  export interface AuthenticationPanelProps {
    controller: AuthenticationPanelController;
  }
</script>

<script lang="ts">
  import type { AuthenticationField } from "#lib/application/auth/types.js";
  import { translateAuthenticationValidation } from "#lib/i18n/auth-feedback.js";
  import AuthenticationError from "#lib/ui/auth/AuthenticationError.svelte";

  import { tick } from "svelte";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { Button, Field, FormActions, Input } from "@a-novel-kit/uikit";

  let { controller }: AuthenticationPanelProps = $props();

  const model = $derived(controller.state.model);
  const action = $derived(controller.state.action);

  const { t } = getI18nContext();
  const componentId = $props.id();
  const emailId = `${componentId}-email`;
  const passwordId = `${componentId}-password`;
  const submitting = $derived(model.state.status === "submitting");
  const issues = $derived(model.state.status === "validation-error" ? model.state.issues : []);

  function fieldError(field: AuthenticationField): string | undefined {
    const issue = issues.find((candidate) => candidate.field === field);
    return issue ? translateAuthenticationValidation(t, issue) : undefined;
  }

  async function submit(event: SubmitEvent) {
    const form = event.currentTarget as HTMLFormElement;
    if (controller.submit(new FormData(form))) return;
    event.preventDefault();
    await tick();
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }
</script>

<form method="POST" {action} aria-busy={submitting} novalidate onsubmit={submit}>
  <Field controlId={emailId} label={t("authUi.authentication.emailLabel")} error={fieldError("email")} required>
    {#snippet children(control)}
      <Input
        {...control}
        name="email"
        type="email"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        readonly={submitting}
        invalid={Boolean(fieldError("email"))}
      />
    {/snippet}
  </Field>

  <Field
    controlId={passwordId}
    label={t("authUi.authentication.passwordLabel")}
    error={fieldError("password")}
    required
  >
    {#snippet children(control)}
      <Input
        {...control}
        name="password"
        type="password"
        autocomplete="current-password"
        readonly={submitting}
        invalid={Boolean(fieldError("password"))}
      />
    {/snippet}
  </Field>

  <FormActions>
    {#snippet feedback()}
      {#if model.state.status === "service-error"}
        <AuthenticationError feedback={model.state.feedback} />
      {/if}
    {/snippet}
    <Button type="submit" disabled={submitting}>
      {submitting
        ? t("authUi.authentication.journeys.login.submitting")
        : t("authUi.authentication.journeys.login.submit")}
    </Button>
  </FormActions>
</form>

<style>
  form {
    display: grid;
    gap: var(--space-4);
    min-inline-size: 0;
  }
</style>
