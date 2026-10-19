# Contributing to platform-template

This guide covers where platform code goes, how a screen is built, how product copy is written, and
how changes are tested. Read the [project overview](./README.md) first; the
[developer guide](https://a-novel-kit.github.io/stack/) covers workspace setup and shared commands.

## Where code goes

A feature spans the runtime layers it needs, and dependencies point inward: routes compose the
layers, client and server code depend on application contracts, and application code stays
framework-free.

| Folder                | Owns                                                  | Never imports                               |
| --------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `src/routes`          | URLs, layouts, loads, form actions, and wiring        |                                             |
| `src/lib/ui`          | Product-specific presentational components            | Environment, services, storage, navigation  |
| `src/lib/application` | Types, state codecs, validation, and use-case logic   | SvelteKit, browser APIs, UI, client, server |
| `src/lib/client`      | Browser adapters for URL state and local storage      | Server code                                 |
| `src/lib/server`      | Sessions, service clients, and private configuration  | Client and UI code                          |
| `src/lib/i18n`        | Locale policy, YAML catalogs, and generated key types |                                             |

Reusable controls belong in UIKit and reusable runtime helpers in nodelib. The platform keeps screen
composition and product behavior.

The foundations every platform keeps live here:

| Foundation                  | Home                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| Shell, navigation and login | `src/routes/(app)`                                                      |
| Session and authorization   | `src/lib/server/auth`                                                   |
| Service calls               | `src/lib/server/service-fetch.ts`                                       |
| Configuration               | `src/env.ts`, `src/lib/server/runtime-config.ts`                        |
| Localization                | `src/hooks.server.ts`, `src/lib/i18n`                                   |
| Tracing                     | `src/instrumentation.server.ts`                                         |
| Health probes               | `src/routes/ping`, `src/routes/healthcheck`, `src/lib/server/health.ts` |
| Planned downtime            | `src/lib/server/downtime.ts`, `src/lib/ui/downtime.svelte.ts`           |

## Building a screen

Each route keeps two files beside its SvelteKit entrypoints. `screen.svelte` renders state and
reports what the user asked for. `controller.svelte.ts` owns that state and its transitions, with no
DOM, route, storage, or network access. `+page.svelte` only connects them. The account page is the
worked example.

Work in that order. Write stories first, one per meaningful state (loading, error, success, long
content, mobile), so the screen can be reviewed in `pnpm storybook` without live services. Then
unit-test the controller, and wire the route last.

Layouts follow three rules:

- Content flows in one column at every width, so reading order matches keyboard order.
- Submit buttons span the form on mobile and fit their label, start-aligned, on desktop. Twice the
  field gap separates them from the last field.
- Errors and confirmations sit directly above the action they concern.

## Server and session rules

The platform server is the only caller of platform services.

- Forms post to same-origin server actions and work without JavaScript.
- Tokens live in HttpOnly cookies. They never reach browser storage, page data, logs, or stories.
- Configuration is declared in `src/env.ts` and read when the server starts. A variable stays
  server-only unless it is declared public. ESLint rejects `import.meta.env`, through which Vite would
  inline values into the browser bundle.
- Pages render user content as text. ESLint rejects `{@html}`.
- A service outage keeps the session cookies and shows a recoverable state. Only a rejected token
  logs the user out.

## Writing copy

Every visible string, accessible name, and page title lives in the YAML catalogs under
`src/lib/i18n/locales`. Components call `t()` with a static key at render time, and code passes
stable codes rather than prose.

The role of a string sets its grammatical form:

| Role                                                        | Form                     | English                    | French                              |
| ----------------------------------------------------------- | ------------------------ | -------------------------- | ----------------------------------- |
| Text asking the reader to act: instructions, guidance       | Formal imperative        | Choose a new password.     | Choisissez un nouveau mot de passe. |
| Controls: buttons, links, accessible names, task tab titles | Infinitive               | Create account             | Créer le compte                     |
| Names and outcomes: field labels, section titles, results   | Noun phrase or statement | Your password was changed. | Votre mot de passe a été modifié.   |

Formal address uses `vous` in French, and the third-person formal form in languages that have one,
such as `usted` in Spanish. English imperative and infinitive share one form, so a control reads
"Log in", never the noun "Login".

Each concept keeps one term across every screen:

| Concept                      | English         | French                       |
| ---------------------------- | --------------- | ---------------------------- |
| Opening and ending a session | log in, log out | se connecter, se déconnecter |
| A user's address             | email address   | courriel                     |

Copy promises only what the backend does. When a service hides whether an account exists, the
confirmation stays conditional ("If this email is registered, you’ll receive…").

Both languages use the typographic apostrophe (’) and the ellipsis character (…) on pending labels.
French puts a no-break space before `:` and a narrow no-break space before `?`, `!`, and `;`.

### Checking translations

After any copy change, run `pnpm i18n:extract`, review both languages, then run `pnpm i18n:check`.
The extraction also regenerates the catalog types, which embed the English text, so an edited English
value needs it as much as a new key. CI runs the same checks in the `lint-translations` job, comparing
the branch with its merge base on `master`, and reports every problem in one run:

| Check     | Fails on                                                                                      | Accepted by                     |
| --------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| Structure | Catalogs out of sync with the code, stale generated types, unused keys, translation-only keys | Nothing                         |
| Gaps      | A translation the branch left empty (`""`), which renders the English text                    | `allow-incomplete-translations` |
| Drift     | An English message the branch changed while its translation kept its value                    | `allow-translation-drift`       |

A changed meaning gets a new key: the old translation stops matching, and the new key shows as a gap.
An English-only fix, such as a typo, keeps its key and takes `allow-translation-drift` once the
translation is checked. Adding or removing a label reruns the check, and a push removes both labels,
since each approves one commit.

## Testing

| Suite      | Covers                                              | Command               |
| ---------- | --------------------------------------------------- | --------------------- |
| Unit       | Application logic, server modules, controllers      | `pnpm test:unit`      |
| Browser    | Component behavior in Chromium                      | `pnpm test:browser`   |
| Storybook  | Every story's interactions and accessibility checks | `pnpm test:storybook` |
| End to end | Real journeys against disposable services           | `pnpm test:e2e`       |

`a-novel test --type=pnpm -y` runs every suite. CI also runs ESLint, Prettier, svelte-check, the
translation checks, secret scanning, and the workflow audit as separate jobs, so each failure names
its concern.

CI runs on pull requests and in the merge queue, not on bare branches: open a draft pull request to
check work in progress. The `with-feature-env` label publishes the pull request's image as
`ghcr.io/a-novel/platform-template:pr-<number>` for its current commit, and a push removes the label.

### End-to-end journeys

The journeys run the production build against disposable authentication, JSON-key, PostgreSQL, and
Mailpit containers, and create accounts from real invitation emails. They also replay the essential
forms with JavaScript disabled. One case stops the authentication container to simulate an outage,
so the suite runs one worker at a time.

```bash
pnpm exec playwright install --with-deps chromium
E2E_CONTAINER_ENGINE=podman pnpm test:e2e
```

Install the browser once. Ports 4173 to 4175, 4180, 14100, and 14825 must be free. With Docker
Compose, omit `E2E_CONTAINER_ENGINE`.

### Screenshot review

The `test-browser` check compares checkpoint screenshots against the master reference once the
repository has its `VISUAL_*` variables. Those name the CI identities and the private Google Drive
folders that infra provisions per platform, as its
[identities](https://github.com/a-novel/infra/blob/master/docs/architecture.md#identities) list. Until
then, the journeys attach their screenshots to the report artifact.

The job summary links a private batch with the HTML report, screenshot diffs, traces, and service
logs; extract it and open `playwright-report` with `pnpm exec playwright show-report`.

Name each checkpoint after its screen with a fixed string. A name derived from copy changes with the
copy, and the comparison then reports a removed screenshot instead of a reviewable diff.

When a visual change is intentional, review the diffs, then have a maintainer with write access apply
the `allow-screenshot-change` label. The label approves the current commit only, so a push removes it;
apply it again once the new commit's diffs are reviewed. Functional failures and upload errors stay
blocking.

To compare locally, extract `snapshots/` from the reference archive into `.visual/snapshots` and run
the suite in the CI image, since another OS, browser, or font set renders differently:

```bash
PLAYWRIGHT_SNAPSHOT_DIR=.visual/snapshots E2E_CONTAINER_ENGINE=podman pnpm test:e2e --update-snapshots=none
```

## Questions?

[Open an issue](https://github.com/a-novel/platform-template/issues) and include the relevant logs and
environment details.
