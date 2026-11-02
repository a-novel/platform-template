# Contributing to platform-template

This document is about working on a platform's code, copy and tests. Read the
[project overview](./README.md) first. The [developer guide](https://a-novel-kit.github.io/stack/)
sets up the workspace and its shared commands.

## Where code goes

A feature spans the runtime layers it needs, and dependencies point inward. Routes compose the layers.
Client and server code depend on application contracts. Application code stays framework-free.

| Folder                | Owns                                                                           | Never imports                               |
| --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| `src/routes`          | URLs, layouts, loads, form actions, and wiring                                 |                                             |
| `src/lib/ui`          | Product-specific presentational components                                     | Environment, services, storage, navigation  |
| `src/lib/application` | Types, state codecs, validation, and use-case logic                            | SvelteKit, browser APIs, UI, client, server |
| `src/lib/client`      | Browser adapters, such as local-storage preferences                            | Server code                                 |
| `src/lib/server`      | Sessions, service clients, and private configuration                           | Client and UI code                          |
| `src/lib/i18n`        | Locale policy, YAML catalogs, generated key types, and stable-code translators |                                             |

Inside `src/lib`, a module imports from its own top-level folder, such as `src/lib/server`, by a
relative path, and from any other folder through `#lib/`.

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

A screen keeps its files beside its SvelteKit entrypoints. `screen.svelte` renders state and reports
what the user asked for. `controller.svelte.ts` owns that state and its transitions, with no DOM,
route, storage, or network access. `+page.svelte` only connects them, and `story.svelte` gives the
screen a fixed-state controller for Storybook. The shell in `src/routes/(app)` is the worked example.

Build the screen first, with one story per meaningful state, such as loading, error, success, long
content and mobile. `pnpm storybook` then shows it without live services. Unit-test the controller
next, and wire the route last.

Each test sits beside the file it covers and takes its name, such as `controller.test.ts` for
`controller.svelte.ts`. Helpers shared between tests live in `*.fixture.ts` modules, which coverage
leaves out.

Layouts follow these rules:

- Content flows in one column at every width, so reading order matches keyboard order.
- Submit buttons span the form on mobile and fit their label, start-aligned, on desktop. Twice the
  field gap separates them from the last field.
- Errors and confirmations sit directly above the action they concern.

## Server and session rules

The platform server is the only caller of platform services.

- People sign in on the account platform. `/auth/sign-in` starts an authorization request there, and
  `/auth/callback` checks its `state` and `iss`, then exchanges the code. The platform serves no
  account form: "Register" and the account page open the account platform.
- Forms post to same-origin server actions and work without JavaScript.
- Tokens live in HttpOnly cookies. They never reach browser storage, page data, logs, or stories.
- Configuration is declared in `src/env.ts` and read when the server starts. A variable stays
  server-only unless it is declared public. ESLint rejects `import.meta.env`, because Vite inlines
  every value read through it into the browser bundle.
- Pages render user content as text. ESLint rejects `{@html}`.
- A service outage keeps the session cookies and shows a recoverable state. Only a rejected token
  logs the user out.
- Logout ends the session on every platform, then clears the cookies. A failed revocation still logs
  the user out of the browser.

## Writing copy

Every visible string, accessible name, and page title lives in the YAML catalogs under
`src/lib/i18n/locales`. Components call `t()` with a static key at render time. The rest of the code
passes stable codes, which components translate.

The role of a string sets its grammatical form:

| Role                                                        | Form                             | English                    | French                              |
| ----------------------------------------------------------- | -------------------------------- | -------------------------- | ----------------------------------- |
| Text asking the reader to act: instructions, guidance       | Formal imperative                | Choose a new password.     | Choisissez un nouveau mot de passe. |
| Controls: buttons, links, accessible names, task tab titles | Infinitive in the reader’s voice | Create account             | Créer mon compte                    |
| Names and outcomes: field labels, section titles, results   | Noun phrase or statement         | Your password was changed. | Votre mot de passe a été modifié.   |

Formal address uses `vous` in French, and the third-person formal form in languages that have one,
such as `usted` in Spanish. English imperative and infinitive share one form, so a control reads
"Log in", never the noun "Login".

A control speaks for the reader, so French controls use the first person: `M’inscrire`,
`Me connecter`, `Gérer mon compte`. Other text speaks to the reader. It names their things with
`votre` and says who acts: `Nous n’avons pas pu vérifier votre session.`, never
`Impossible de vérifier la session.`

Each concept keeps one term across every screen:

| Concept                      | English         | French                       |
| ---------------------------- | --------------- | ---------------------------- |
| Opening and ending a session | log in, log out | se connecter, se déconnecter |
| A user's address             | email address   | courriel                     |

Copy promises only what the backend does. When a service hides whether an account exists, the
confirmation stays conditional ("If this email is registered, you’ll receive…").

Both languages use the typographic apostrophe (’) and the ellipsis character (…) on pending labels.
French puts no space before `:`, and a narrow no-break space before `?`, `!`, and `;`.

### Checking translations

After any copy change, run `pnpm i18n:extract`, review both languages, then run `pnpm i18n:check`.
The extraction also regenerates the catalog types. Those embed the English text, so an edited English
value needs the extraction as much as a new key does. CI runs the same checks in the
`lint-translations` job. The job compares the branch with its merge base on `master` and reports every
problem in one run:

| Check     | Fails on                                                                                      | Accepted by                     |
| --------- | --------------------------------------------------------------------------------------------- | ------------------------------- |
| Structure | Catalogs out of sync with the code, stale generated types, unused keys, translation-only keys | Nothing                         |
| Gaps      | A translation the branch left empty (`""`), which renders the English text                    | `allow-incomplete-translations` |
| Drift     | An English message the branch changed while its translation kept its value                    | `allow-translation-drift`       |

A changed meaning gets a new key. The old translation stops matching, and the new key shows as a gap.
An English-only fix, such as a typo, keeps its key and takes `allow-translation-drift` once the
translation is checked. Adding or removing a label reruns the check. Each label approves one commit, so
a push removes both.

## Testing

| Suite      | Covers                                              | Command               |
| ---------- | --------------------------------------------------- | --------------------- |
| Unit       | Application logic, server modules, controllers      | `pnpm test:unit`      |
| Browser    | Component behavior in Chromium                      | `pnpm test:browser`   |
| Storybook  | Every story's interactions and accessibility checks | `pnpm test:storybook` |
| End to end | Real journeys against disposable services           | `pnpm test:e2e`       |

`a-novel test --type=pnpm -y` runs every suite. CI runs each lint and security check as its own job,
so a failure names its concern.

CI runs on pull requests and in the merge queue. Open a draft pull request to check work in progress.
The `with-feature-env` label publishes the pull request's image as
`ghcr.io/a-novel/platform-template:pr-<number>` for its current commit, and a push removes the label.

### End-to-end journeys

The journeys run the production build against the disposable services of `builds/compose.e2e.yaml`,
and create accounts from real invitation emails. The stack runs the account platform, where the
journeys sign in, and a service-token issuer that lets the authentication service tell the platform
apart. They also replay the essential forms with JavaScript disabled. One case stops the
authentication container to simulate an outage, so the suite runs one worker at a time.

Install the browser once, then run the suite. It needs ports 4173 to 4175, 4180, 14100 to 14102, and
14825 free. With Docker Compose, omit `E2E_CONTAINER_ENGINE`.

```bash
pnpm exec playwright install --with-deps chromium
E2E_CONTAINER_ENGINE=podman pnpm test:e2e
```

### Screenshot review

The required `test-browser` check compares checkpoint screenshots against the master reference, kept
in a private Google Shared Drive. The repository's `VISUAL_*` variables name its Drive folders and the
[CI identities](https://github.com/a-novel/infra/blob/master/docs/architecture.md#identities) that
infra provisions per platform. A repository without them skips the comparison and attaches its
screenshots to the report artifact.

With the comparison on, the job summary links a private batch of the run's evidence, such as the HTML
report and the screenshot diffs. Extract the batch, then open its report:

```bash
pnpm exec playwright show-report playwright-report
```

Name each checkpoint after its screen with a fixed string. A name derived from copy changes with the
copy, and the comparison then reports a removed screenshot instead of a reviewable diff.

When a visual change is intentional, review the diffs, then have a maintainer with write access apply
the `allow-screenshot-change` label. The label approves the current commit only, so a push removes it.
Apply it again once the new commit's diffs are reviewed. Functional failures and upload errors stay
blocking.

To compare locally, extract `snapshots/` from the master reference archive into `.visual/snapshots`.
Another OS, browser, or font set renders differently. Run the browser in the Playwright image of the
pinned version, and keep the suite and its services on the host:

```bash
PLAYWRIGHT_VERSION="$(node -p 'require("playwright/package.json").version')"
podman run --detach --rm --name template-playwright --network host --init \
  --volume "$PWD:$PWD:z" --workdir "$PWD" \
  "mcr.microsoft.com/playwright:v$PLAYWRIGHT_VERSION-noble" \
  node node_modules/playwright/cli.js run-server --port 3123 --host 127.0.0.1
PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3123/ PLAYWRIGHT_SNAPSHOT_DIR=.visual/snapshots \
  E2E_CONTAINER_ENGINE=podman pnpm test:e2e --update-snapshots=none
podman stop template-playwright
```

## Questions?

[Open an issue](https://github.com/a-novel/platform-template/issues) and include the relevant logs and
environment details.
