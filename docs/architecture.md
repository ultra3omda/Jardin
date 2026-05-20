# Architecture — École SaaS

> Vague 1 — Auth multi-tenant + Backend NestJS + PostgreSQL

## High-level diagram

```text
┌──────────────────┐     ┌──────────────────┐
│  Web (Next.js)   │     │  Mobile (Expo)   │
│  apps/web        │     │  apps/mobile     │
│  Vercel deploy   │     │  (Vague 2)       │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │  /api/auth/*           │
         ▼  (Route Handler)       │
┌─────────────────────────────┐   │
│  Next.js Route Handler      │   │
│  - Manages httpOnly cookie  │   │
│  - Proxies to NestJS        │   │
└────────┬────────────────────┘   │
         │                        │
         │  HTTPS                 │
         ▼                        ▼
┌──────────────────────────────────────┐
│  NestJS API (apps/api)               │
│  - JWT auth + tenant context (ALS)   │
│  - Prisma extension (tenant filter)  │
│  - Pino logs + Throttler + Helmet    │
└────────┬─────────────────────────────┘
         │
         │  Prisma
         ▼
┌──────────────────────────────────────┐
│  PostgreSQL 16                       │
│  - Tenant, User, RefreshToken,       │
│    AuditLog                          │
└──────────────────────────────────────┘
```

## NestJS module map (Vague 1)

| Module                | Path                           | Role                                            |
| --------------------- | ------------------------------ | ----------------------------------------------- |
| ConfigModule          | `apps/api/src/common/config/`  | Validates env vars at startup (class-validator) |
| LoggerModule          | `apps/api/src/common/logger/`  | Pino + redaction (passwords, tokens, cookies)   |
| TenantModule (global) | `apps/api/src/common/tenant/`  | AsyncLocalStorage tenant context                |
| PrismaModule (global) | `apps/api/src/common/prisma/`  | Raw `PrismaService` + `TenantPrismaService`     |
| AuthModule            | `apps/api/src/auth/`           | Register / login / refresh / logout / me        |
| HealthModule          | `apps/api/src/health/`         | Liveness probe (`GET /health`)                  |
| ThrottlerModule       | wired in `AppModule`           | Rate limiting (100 req/min/ip global)           |

## Data flow — authenticated request

1. Browser sends request with `Authorization: Bearer <access>`
2. NestJS receives the request
3. `JwtAuthGuard` validates the JWT signature + expiry, attaches `req.user`
4. `RolesGuard` checks `@Roles(...)` metadata on the controller
5. `TenantContextInterceptor` wraps the handler in `tenantContext.run({...})`
6. Controller method runs; tenant-scoped services call
   `tenantPrisma.client.<model>.findMany(...)` (or `findFirst`, etc.)
7. Prisma extension reads context via AsyncLocalStorage, injects
   `where: { tenantId: <current> }`
8. SQL query is automatically scoped — impossible to read another
   tenant's data, regardless of a bug in business logic

## Threat model — Vague 1

| Threat                  | Mitigation                                                                        |
| ----------------------- | --------------------------------------------------------------------------------- |
| Stolen refresh token    | Rotation + reuse detection (chain wipe) — see ADR 0001 §3                         |
| XSS exfiltrating tokens | Refresh token in httpOnly cookie; access token in memory only                     |
| Cross-tenant data read  | Prisma extension auto-inject; e2e isolation test                                  |
| Brute force on login    | bcrypt 12 rounds + Throttler (100 req/min/ip); per-endpoint throttling planned    |
| Replay of expired JWT   | `ignoreExpiration: false` in passport-jwt                                         |
| SQL injection           | Prisma parameterized queries everywhere; no raw SQL in business code              |
| Secret leak in logs     | Pino redact paths: passwords, tokens, cookies, authorization header               |

## See also

- [docs/adr/0001-auth-strategy.md](./adr/0001-auth-strategy.md) — auth decisions detail
- [apps/api/README.md](../apps/api/README.md) — API setup, env vars
- [README.md](../README.md) — monorepo overview, local setup
- [docker-compose.yml](../docker-compose.yml) — local Postgres
