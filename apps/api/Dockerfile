# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage Dockerfile for @ecole-saas/api (NestJS + Prisma)
# Optimised for Railway / Render / Fly deployments from monorepo root.
# Build context : repo root (NOT apps/api/). Set in railway.json or `docker build`.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# ─── deps stage: install all monorepo deps (cached unless lockfile changes) ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN pnpm install --frozen-lockfile --filter=@ecole-saas/api...

# ─── builder stage: compile TS → JS + generate Prisma client ────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter=@ecole-saas/shared build
RUN pnpm --filter=@ecole-saas/api exec prisma generate
RUN pnpm --filter=@ecole-saas/api build

# ─── runtime stage: only what's needed at run-time ──────────────────────────
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Copy production node_modules + built artefacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

WORKDIR /app/apps/api

# start:prod runs `prisma migrate deploy && node dist/main` — idempotent on every boot
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
