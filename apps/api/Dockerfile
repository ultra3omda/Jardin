# Klasso API — multi-stage Docker build for a pnpm/turbo monorepo.
# Build context = repository root: `docker build -f apps/api/Dockerfile .`
# Runtime: `start:prod` runs `prisma migrate deploy && node dist/main`.

FROM node:20-bookworm-slim AS base
# openssl is required by the Prisma query engine (debian-openssl-3.0.x).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- build stage: install all deps, build shared + api, generate Prisma ----
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ecole-saas/shared build \
  && pnpm --filter @ecole-saas/api exec prisma generate \
  && pnpm --filter @ecole-saas/api build

# ---- runtime stage: minimal layout, workspace symlinks preserved ----
FROM base AS runner
ENV NODE_ENV=production
# Root .pnpm/ store + workspace tools (turbo, prettier, typescript, ...).
# With pnpm node-linker=isolated (default since SDK 54 upgrade), the actual
# package files live under node_modules/.pnpm/<hash>/node_modules/<pkg>, and
# each workspace gets a node_modules/ of *symlinks* into that store. Both
# layers must be copied for the symlinks to resolve at runtime.
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml ./
# packages/shared is symlinked from node_modules → its dist + node_modules
# (workspace symlinks like @ecole-saas/*) must exist at the same paths.
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/node_modules ./packages/shared/node_modules
# api build output + prisma (schema + migrations needed for migrate deploy at boot).
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
# Isolated linker: api's runtime deps are symlinks living in this directory.
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules

WORKDIR /repo/apps/api
EXPOSE 4000
# PORT is injected by the platform (Railway/Render); main.ts honours it.
CMD ["pnpm", "run", "start:prod"]
