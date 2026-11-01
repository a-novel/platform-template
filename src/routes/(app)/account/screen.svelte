<script module lang="ts">
  import type { AccountScreenController } from "./controller.svelte";

  /** Props for the pure protected account screen. */
  export interface AccountScreenProps {
    controller: AccountScreenController;
  }
</script>

<script lang="ts">
  import { translateAuthenticationFeedback } from "#lib/i18n/auth-feedback.js";

  import { getI18nContext } from "@a-novel-kit/nodelib-i18n/svelte";
  import { Alert, Badge, Button, Card, Container, FormActions, PageHeader, Stack } from "@a-novel-kit/uikit";

  import { ShieldCheck } from "@lucide/svelte";

  let { controller }: AccountScreenProps = $props();

  const model = $derived(controller.state.model);
  const loggingOut = $derived(model.logoutState === "submitting");

  const componentId = $props.id();
  const { t } = getI18nContext();

  function submitLogout(event: SubmitEvent) {
    if (!controller.submitLogout()) event.preventDefault();
  }
</script>

<div class="account-screen">
  <Container size="sm" gutter={false}>
    <Stack gap="4">
      <PageHeader title={t("authUi.account.title")} description={t("authUi.account.description")} />

      <Stack gap="4">
        <Card surface="raised">
          <section id="account-email" class="card-section" aria-labelledby={`${componentId}-email-title`}>
            <header class="section-heading">
              <h2 id={`${componentId}-email-title`}>{t("authUi.account.email.title")}</h2>
            </header>

            {#if model.credentials.status === "ready"}
              <dl class="details">
                <div>
                  <dt>{t("authUi.account.email.current")}</dt>
                  <dd>{model.credentials.email}</dd>
                </div>
                {#if model.credentials.pendingEmail}
                  {@const pending = model.credentials.pendingEmail}
                  <div>
                    <dt>{t("authUi.account.email.pending")}</dt>
                    <dd>{pending.email}</dd>
                    <dd class="pending-expiry">
                      {t("authUi.account.email.pendingExpiry", { date: pending.expiresAt })}
                    </dd>
                  </div>
                {/if}
              </dl>
            {:else}
              <p class="feedback-message">{t("authUi.account.email.unavailable")}</p>
            {/if}
          </section>
        </Card>

        <section id="account-claims" class="session-summary" aria-labelledby={`${componentId}-claims-title`}>
          <div class="section-heading">
            <ShieldCheck size="var(--icon-size-md)" aria-hidden="true" />
            <h2 id={`${componentId}-claims-title`}>{t("authUi.account.claims.title")}</h2>
          </div>

          {#if model.claims.status === "loading"}
            <Alert tone="loading" title={t("authUi.account.loadingTitle")} />
          {:else if model.claims.status === "error"}
            <Alert tone="error" title={t("authUi.account.loadErrorTitle")}>
              {translateAuthenticationFeedback(t, model.claims.feedback)}
            </Alert>
          {:else}
            <dl class="details">
              <div class="session-identity">
                <dt>{t("authUi.account.claims.userId")}</dt>
                <dd class="monospace">{model.claims.userId}</dd>
              </div>
              <div class="session-identity">
                <dt>{t("authUi.account.claims.roles")}</dt>
                <dd>
                  <div class="roles">
                    {#each model.claims.roles as role (role)}
                      <Badge tone="brand">{role}</Badge>
                    {:else}
                      <span>{t("authUi.account.claims.noRoles")}</span>
                    {/each}
                  </div>
                </dd>
              </div>
              <div class="session-expiry">
                <dt>{t("authUi.account.claims.accessExpiresAt")}</dt>
                <dd>{model.claims.accessExpiresAt}</dd>
              </div>
              <div class="session-expiry">
                <dt>{t("authUi.account.claims.refreshExpiresAt")}</dt>
                <dd>{model.claims.refreshExpiresAt}</dd>
              </div>
            </dl>
          {/if}

          <form
            id="account-session"
            method="POST"
            action={controller.state.logoutAction}
            aria-busy={loggingOut}
            onsubmit={submitLogout}
          >
            <FormActions>
              {#snippet feedback()}
                <p id={`${componentId}-logout-description`} class="feedback-message">
                  {t("authUi.account.logout.description")}
                </p>
              {/snippet}
              <Button
                type="submit"
                variant="outline"
                tone="neutral"
                aria-describedby={`${componentId}-logout-description`}
                disabled={loggingOut}
              >
                {loggingOut ? t("authUi.account.logout.submitting") : t("authUi.account.logout.submit")}
              </Button>
            </FormActions>
          </form>
        </section>
      </Stack>
    </Stack>
  </Container>
</div>

<style>
  .account-screen {
    padding-inline: var(--layout-gutter);
    padding-block: var(--space-6) var(--space-12);
  }

  .session-summary,
  .card-section,
  form {
    display: grid;
    gap: var(--space-4);
    min-inline-size: 0;
  }

  .card-section,
  .session-summary,
  #account-session {
    scroll-margin-block-start: var(--space-5);
  }

  .session-summary,
  #account-session {
    padding-block-start: var(--space-4);
  }

  .section-heading {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  header.section-heading {
    display: grid;
    gap: var(--space-2);
  }

  .section-heading > :global(svg) {
    flex: none;
    align-self: center;
    color: var(--color-text-accent);
  }

  h2,
  .feedback-message {
    margin: 0;
  }

  h2 {
    min-inline-size: 0;
    color: var(--color-text-primary);
    font-size: var(--font-size-xl);
    font-family: var(--font-family-display);
    overflow-wrap: anywhere;
  }

  .feedback-message {
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
  }

  .details {
    display: grid;
    gap: var(--space-4);
    margin: 0;
  }

  @media (min-width: 35rem) {
    .details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .details > div {
    display: grid;
    align-content: start;
    gap: var(--space-1);
    min-inline-size: 0;
  }

  .session-identity {
    grid-column: 1 / -1;
  }

  .details dt {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .details dd {
    margin: 0;
    line-height: var(--line-height-normal);
    overflow-wrap: anywhere;
  }

  .roles {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .monospace {
    font-size: var(--font-size-sm);
    font-family: var(--font-family-mono);
  }

  .details .pending-expiry {
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  @media (max-width: 34.999rem) {
    .account-screen {
      padding-inline: var(--space-2);
      padding-block-start: var(--space-3);
    }

    .details {
      gap: var(--space-3);
    }

    .details > .session-expiry {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-1) var(--space-3);
      font-size: var(--font-size-sm);
    }
  }
</style>
