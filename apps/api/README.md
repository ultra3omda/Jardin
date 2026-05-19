# 🔧 Backend API (NestJS)

> 🚧 À venir en **Vague 1**

API REST + WebSocket pour la plateforme SaaS multi-tenant.

## Stack prévue

- NestJS 10+
- Prisma ORM
- PostgreSQL 16
- Redis (cache + queues BullMQ)
- JWT auth + Refresh tokens
- Multi-tenant via `tenant_id` (Row-Level Security)
- Swagger / OpenAPI auto-généré

## Hébergement prévu

- **Railway** ou **Render** pour l'API
- **Neon** ou **Supabase** pour PostgreSQL
- **Upstash** pour Redis

## Setup à venir

```bash
cd apps/api
pnpm install
docker compose up -d  # postgres + redis local
pnpm prisma migrate dev
pnpm dev
```
