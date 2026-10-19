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

**2. Rename the platform.** Replace `platform-template` with the new repository's name, then the
`template` placeholders below. This command lists both:

```bash
git grep -n -i template -- . ':!pnpm-lock.yaml'
```

| What                | Where                                                               | Why it changes                                                                         |
| ------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Session cookies     | `src/lib/server/auth/session.ts`                                    | Platforms share one origin behind the gateway, so each names its cookies after itself. |
| Rail preference key | `src/lib/client/shell/rail-preference.ts`                           | Local storage is shared across that origin too.                                        |
| Product name        | `src/lib/i18n/locales/*/common.yaml`                                | `pageTitles.brand`, `shell.brand` and `shell.navigation` name the product users see.   |
| Test placeholders   | `builds/compose.e2e.yaml`, the tests, `.github/workflows/main.yaml` | Test accounts, project names and report names follow the platform name.                |

**3. Replace the sample route.** The account page under `src/routes/(app)/account/` is the sample
authenticated route. Its server module is `src/lib/server/auth/account-route.ts`, its copy sits under
`authUi.account` in the catalogs, and `tests/e2e/authentication.spec.ts` covers it end to end. Copy
its shape for your first screen, then remove what you no longer use.

**4. Keep the foundations.** The shell, login and session handling, localization, tracing, health
probes, planned downtime, the container, CI and the test setup stay as they are.
[CONTRIBUTING.md](./CONTRIBUTING.md) says where each one lives.

**5. Verify.** Run the checks, then delete this section and describe the new platform in this README:

```bash
pnpm format
pnpm lint
a-novel test --type=pnpm -y
a-novel build -y
```

## What it does

A platform is one of the A-Novel browser applications. Its SvelteKit server renders the pages and
is the only caller of the platform services, so session tokens stay in server-set cookies and never
reach browser code.

This one is a working skeleton: a navigation shell, a login dialog and a protected account page,
backed by the authentication service. It ships as one container image. Every screen state is also on
display in the [published Storybook](https://a-novel.github.io/platform-template/).

## Deploying

Run a tag from the [latest release](https://github.com/a-novel/platform-template/releases/latest) and
point it at the authentication service.

```bash
podman run --detach --name platform-template --publish 3000:3000 \
  --env AUTHENTICATION_SERVICE_URL \
  ghcr.io/a-novel/platform-template:"$PLATFORM_TEMPLATE_VERSION"
```

The image runs as a non-root user on port `3000`, and its container healthcheck calls `/ping`.

### Configuration

The server reads its configuration from the environment when it starts. Nothing is compiled into the
browser bundle.

| Name                              | Required       | Description                                                                                                                |
| --------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `AUTHENTICATION_SERVICE_URL`      | Yes            | Base HTTP or HTTPS URL for the authentication service.                                                                     |
| `AUTHENTICATION_SERVICE_AUDIENCE` | Cloud Run      | Audience of the Google ID token the authentication service's IAM admits. The platform fetches it from the metadata server. |
| `ADDRESS_HEADER`, `XFF_DEPTH`     | Behind a proxy | Where the visitor's IP is read, which the platform forwards for rate limiting. On Cloud Run, `X-Forwarded-For` and `1`.    |
| `HEALTHCHECK_TIMEOUT_MS`          | No             | Downstream timeout from 100 to 10,000 ms. The default is 2,000.                                                            |
| `DOWNTIME_URL`                    | No             | Planned downtime document. The default is the one infra publishes.                                                         |
| `OTEL`                            | No             | `true` records traces, continuing an incoming `traceparent`.                                                               |
| `GCLOUD_PROJECT_ID`               | No             | Exports traces to this Google Cloud project instead of stdout.                                                             |
| `HOST`                            | No             | Listen address. The image sets `0.0.0.0`.                                                                                  |
| `PORT`                            | No             | Listen port. The image sets `3000`.                                                                                        |

## Operational endpoints

| Path           | Success | Purpose                                                                                            |
| -------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `/ping`        | `200`   | Liveness: the process serves traffic. No downstream call.                                          |
| `/healthcheck` | `200`   | Readiness: reports each downstream service with its own dependency map. Any failure returns `503`. |

## Running locally

Configure pnpm for GitHub Packages with a token that can read packages, then start the
authentication service and the platform:

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
