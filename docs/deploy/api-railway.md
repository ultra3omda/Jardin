# Déploiement de l'API (Railway)

> L'API Klasso (`apps/api`) se déploie via Docker. Image : `apps/api/Dockerfile` (contexte = racine du repo).

## Image Docker
- Multi-stage, monorepo pnpm. Build : `docker build -f apps/api/Dockerfile -t klasso-api .` (depuis la racine).
- Runtime : `pnpm run start:prod` → `prisma migrate deploy && node dist/main`.
- Le port est injecté par la plateforme (`PORT`) ; `main.ts` l'honore, écoute sur `0.0.0.0`.
- Healthcheck : `GET /health`.
- Prisma : `binaryTargets = ["native", "debian-openssl-3.0.x"]` (image `node:20-bookworm-slim` + `openssl`).

## Railway
- `apps/api/railway.json` : builder DOCKERFILE, `dockerfilePath: apps/api/Dockerfile`, healthcheck `/health`.
- **Variables à configurer** (Railway → service API) : `DATABASE_URL` (Postgres Neon), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_ROUNDS`, `CORS_ORIGIN`, `WEB_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, (option) `R2_*`, `SENTRY_DSN_API`, `EXPO_PUSH_ACCESS_TOKEN`, `CLICTOPAY_BASE_URL`, `CLICTOPAY_USER`, `CLICTOPAY_PWD`. Voir `.env.example`.
- **`migrate deploy` au boot** applique automatiquement les migrations (la table Postgres doit exister).

## CI/CD
- `.github/workflows/ci.yml` : job **`docker-build-api`** valide que l'image build à chaque PR (sans push).
- `.github/workflows/deploy-api.yml` : déploie sur push `main` **uniquement si `secrets.RAILWAY_TOKEN` est défini** (sinon skip → CI verte). Variable optionnelle `RAILWAY_API_SERVICE` (défaut `api`).

## Pré-requis opérateur (hors code)
1. Créer le projet/service Railway + base Postgres (ou Neon) → `DATABASE_URL`.
2. Renseigner les variables ci-dessus.
3. Ajouter `RAILWAY_TOKEN` aux secrets GitHub (+ `RAILWAY_API_SERVICE` si ≠ `api`).
4. Vérifier `apps/web/next.config.mjs` (CSP) pointe l'URL API réelle.
5. Premier déploiement → vérifier `/health` + logs `migrate deploy`.
