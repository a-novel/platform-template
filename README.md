# Platform Template

A scaffold for new A-Novel platforms: fork it, rename it, and replace its sample account page with your own screens.

[![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/agorastoryverse)](https://twitter.com/agorastoryverse)
[![Discord](https://img.shields.io/discord/1315240114691248138?logo=discord)](https://discord.gg/rp4Qr8cA)

<hr />

![GitHub repo file or directory count](https://img.shields.io/github/directory-file-count/a-novel/platform-template)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/a-novel/platform-template)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/a-novel/platform-template/main.yaml)
[![codecov](https://codecov.io/gh/a-novel/platform-template/graph/badge.svg)](https://codecov.io/gh/a-novel/platform-template)

![Coverage graph](https://codecov.io/gh/a-novel/platform-template/graphs/sunburst.svg)

## Using this template

This repository starts a new platform. It is not an application you deploy as is. The rest of this
README shows the standard platform README your fork inherits.

**1. Create the repository.** Follow the developer guide's
[repository runbook](https://a-novel-kit.github.io/stack/sysadmins/create-repository), which creates a
`platform-*` repository from this template.

**2. Rename the platform.** Replace `platform-template` with the new repository's name, then each
placeholder below. This command lists every `template` occurrence:

```bash
git grep -n -i template -- . ':!pnpm-lock.yaml'
```

| What                | Where                                                               | Why it changes                                                                         |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Session cookies     | `src/lib/server/auth/session.ts`                                    | Platforms share one origin behind the gateway, so each names its cookies after itself. |
| Rail preference key | `src/lib/client/shell/rail-preference.ts`                           | Local storage is shared across that origin too.                                        |
| Product name        | `src/lib/i18n/locales/*/common.yaml`                                | `pageTitles.brand`, `shell.brand` and `shell.navigation` name the product users see.   |
| Test placeholders   | `builds/compose.e2e.yaml`, the tests, `.github/workflows/main.yaml` | Test accounts, project names and report names follow the platform name.                |
| Product logo        | `src/routes/+layout.svelte`, `src/routes/(app)/screen.svelte`       | The favicon, banner and icon show the Agora logo until the product has its own.        |

**3. Replace the sample route.** The account page under `src/routes/(app)/account/` is the sample
authenticated route. Its server module is `src/lib/server/auth/account-route.ts`, and its copy sits
under `authUi.account` in the catalogs. `tests/e2e/authentication.spec.ts` covers it end to end. Copy
its shape for your first screen, then remove what you no longer use.

**4. Keep the foundations.** The foundations every platform shares stay as they are, along with the
container, CI and the test setup. The [contribution guide](./CONTRIBUTING.md#where-code-goes) names
the home of each foundation.

**5. Verify.** Run the checks:

```bash
pnpm format
pnpm lint
a-novel test --type=pnpm -y
a-novel build -y
```

Then delete this section and describe the new platform in this README.

## What it does

A platform is one of the A-Novel browser applications. Its SvelteKit server renders the pages and
is the only caller of the platform services. Session tokens stay in server-set cookies and never
reach browser code.

This one is a working skeleton: a navigation shell, a login dialog and a protected account page,
backed by the authentication service. The template ships as one container image. The
[published Storybook](https://a-novel.github.io/platform-template/) shows every screen state.

## Deploying

Run a tag from the [latest release](https://github.com/a-novel/platform-template/releases/latest) and
point it at the authentication service. The image runs as a non-root user on port `3000`, and its
container healthcheck calls `/ping`.

```bash
PLATFORM_TEMPLATE_VERSION="vX.Y.Z"
AUTHENTICATION_SERVICE_URL="https://authentication.example.com"
podman run --detach --name platform-template --publish 3000:3000 \
  --env AUTHENTICATION_SERVICE_URL="$AUTHENTICATION_SERVICE_URL" \
  ghcr.io/a-novel/platform-template:"$PLATFORM_TEMPLATE_VERSION"
```

### Configuration

The server reads its configuration from the environment when it starts. Nothing is compiled into the
browser bundle.

| Name                              | Required       | Description                                                                                                                |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `AUTHENTICATION_SERVICE_URL`      | Yes            | Base HTTP or HTTPS URL for the authentication service.                                                                     |
| `AUTHENTICATION_SERVICE_AUDIENCE` | Cloud Run      | Audience of the Google ID token the authentication service's IAM admits. The platform fetches it from the metadata server. |
| `SERVICE_TOKEN_PATH`              | Kubernetes     | File of the projected service token, sent instead of a Google ID token. The platform reads it on every call.               |
| `ADDRESS_HEADER`, `XFF_DEPTH`     | Behind a proxy | Where the visitor's IP is read, which the platform forwards for rate limiting. On Cloud Run, `X-Forwarded-For` and `1`.    |
| `HEALTHCHECK_TIMEOUT_MS`          | No             | Downstream timeout from 100 to 10,000 ms. The default is 2,000.                                                            |
| `DOWNTIME_URL`                    | No             | Planned downtime document. The default is the one infra publishes.                                                         |
| `OTEL`                            | No             | `true` records traces, continuing an incoming `traceparent`.                                                               |
| `OTEL_EXPORTER_OTLP_ENDPOINT`     | No             | Exports traces over OTLP/HTTP to this base URL instead of stdout.                                                          |
| `OTEL_EXPORTER_OTLP_HEADERS`      | No             | Headers each export sends, such as the backend's key. Inject it as a secret.                                               |
| `OTEL_EXPORTER_OTLP_COMPRESSION`  | No             | `gzip` compresses each export.                                                                                             |
| `HOST`                            | No             | Listen address. The image sets `0.0.0.0`.                                                                                  |
| `PORT`                            | No             | Listen port. The image sets `3000`.                                                                                        |

## Operational endpoints

| Path           | Success | Purpose                                                                                            |
| -------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `/ping`        | `200`   | Liveness: the process serves traffic. No downstream call.                                          |
| `/healthcheck` | `200`   | Readiness: reports each downstream service with its own dependency map. Any failure returns `503`. |

## Running locally

Installing the platform's packages needs your
[GitHub Packages token](https://a-novel-kit.github.io/stack/dependencies/node#configure). Start the
authentication service, then the platform:

```bash
a-novel run start service-authentication/rest
eval "$(a-novel run env service-authentication)"
pnpm install
pnpm dev
```

The committed `.env.local` reads the service port from that environment. `pnpm storybook` serves the
screen catalog at `http://localhost:6006`.

## Contributing

Start with the [developer guide](https://a-novel-kit.github.io/stack/),
then read the [contribution guide](./CONTRIBUTING.md).
