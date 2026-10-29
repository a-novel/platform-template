# syntax=docker/dockerfile:1.28

FROM docker.io/library/node:26.13.0-alpine3.23 AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Node.js 25 and later ship no Corepack, so npm installs the pnpm release package.json pins.
# Like Corepack, it skips pnpm's install scripts, which only swap in a native binary.
RUN npm install --global --ignore-scripts "pnpm@$(node -p 'require("./package.json").packageManager.split("@")[1]')"
RUN --mount=type=secret,id=npm_token,required=true \
    pnpm config set --global "//npm.pkg.github.com/:_authToken" "$(cat /run/secrets/npm_token)" && \
    pnpm install --frozen-lockfile && \
    pnpm config delete --global "//npm.pkg.github.com/:_authToken"

FROM dependencies AS builder

COPY . .
RUN pnpm build && pnpm prune --prod

FROM docker.io/library/node:26.13.0-alpine3.23 AS runtime

ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

# The base image's node user, by ID so a runtime can verify it is not root.
USER 1000:1000

EXPOSE 3000

HEALTHCHECK --interval=1s --timeout=5s --retries=10 --start-period=1s \
  CMD ["wget", "-qO", "/dev/null", "http://127.0.0.1:3000/ping"]

STOPSIGNAL SIGTERM

CMD ["node", "build"]
