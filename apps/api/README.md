# 🔧 @ecole-saas/api

Backend API NestJS pour la plateforme SaaS multi-tenant.

## Stack

- NestJS 10 (Express adapter)
- TypeScript strict
- Prisma ORM + PostgreSQL 16
- JWT (access 15min + refresh 30j, rotation)
- Pino structured logging (PII redaction)
- Swagger / OpenAPI auto-généré
- Helmet + Throttler (rate limiting)
- class-validator pour les DTOs

## Setup local

1. **Copier les variables d'environnement**

   ```bash
   cp .env.example .env
   ```

   Génère des secrets JWT (≥ 256 bits) :

   ```bash
   openssl rand -base64 48   # une fois pour JWT_ACCESS_SECRET
   openssl rand -base64 48   # une fois pour JWT_REFRESH_SECRET
   ```

2. **Démarrer Postgres** (depuis la racine du monorepo)

   ```bash
   docker compose up -d
   ```

3. **Installer les dépendances**

   ```bash
   pnpm install
   ```

4. **Lancer l'API en dev**

   ```bash
   pnpm --filter=@ecole-saas/api dev
   ```

L'API tourne sur `http://localhost:4000`.

## Endpoints

| Route                | Description                        |
| -------------------- | ---------------------------------- |
| `GET  /health`       | Liveness probe                     |
| `GET  /api/docs`     | Swagger UI                         |
| `POST /api/auth/*`   | Auth endpoints (Vague 1, en cours) |
| `POST /api/commercial/agents`           | SUPER_ADMIN crée un sous-admin COMMERCIAL |
| `POST /api/commercial/contracts/upload-url` | URL R2 présignée pour le PDF du contrat |
| `POST /api/commercial/organizations`    | COMMERCIAL/SUPER_ADMIN crée une org signée + contrat + invitation |
| `GET  /api/commercial/organizations`    | Liste des organisations (siennes / toutes) |
| `GET  /api/onboarding/status`           | État de l'onboarding de l'org courante (SCHOOL_ADMIN) |
| `POST /api/onboarding/complete`         | Termine le wizard bloquant (nom + couleurs + logo) → org ACTIVE |

## Scripts

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | NestJS en watch mode                 |
| `pnpm build`       | Build production (`dist/`)           |
| `pnpm start`       | Run production build                 |
| `pnpm lint`        | ESLint                               |
| `pnpm type-check`  | TypeScript strict check              |
| `pnpm test`        | Vitest (unit + e2e)                  |
| `pnpm test:cov`    | Coverage (seuil 70%)                 |

## Variables d'environnement

Voir `.env.example` à la racine du monorepo. Toutes sont validées par
`class-validator` au démarrage (l'API refuse de démarrer si une variable
est manquante ou invalide).

## Sécurité

- bcrypt rounds **12**
- JWT HS256 avec secrets ≥ 256 bits
- Refresh token rotation côté DB
- Helmet sur tous les endpoints
- Rate limiting global (100 req/min/ip)
- CORS strict (whitelist via `CORS_ORIGIN`)
- PII redactée des logs (passwords, tokens, cookies)

## Multi-tenant

Voir `docs/adr/0001-auth-strategy.md` (Vague 1, à venir).
