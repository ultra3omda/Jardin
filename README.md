# 🏫 École SaaS

> Plateforme SaaS de gestion complète pour écoles et jardins d'enfants
> (Web + Mobile iOS/Android, multi-tenant, multi-langue)

---

## 📦 Architecture

Monorepo géré par **Turborepo + pnpm** :

```
ecole-saas/
├── apps/
│   ├── web/        # Next.js 14 — Back-office (Vague 0 ✅)
│   ├── mobile/     # Expo / React Native (Vague 2 🚧)
│   └── api/        # NestJS + Prisma (Vague 1 🚧)
├── packages/
│   ├── shared/             # Types & utils communs
│   ├── typescript-config/  # tsconfig partagés
│   └── eslint-config/      # configs lint
└── .github/workflows/      # CI/CD
```

---

## 🚀 Démarrage rapide (local)

### Prérequis

- **Node.js** 20.18.0 (cf. `.nvmrc`) — installer via [fnm](https://github.com/Schniz/fnm) ou nvm
- **pnpm** 9.12.0 → `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- **Docker** + Docker Compose (pour Postgres local — Vague 1+)
- **OpenSSL** (pour générer les secrets JWT)

> 💡 **Windows** : utiliser **WSL2** (Ubuntu) pour éviter les blocages
> Smart App Control sur les binaires natifs (esbuild, bcrypt, Prisma engines).

### Installation

```bash
git clone <votre-repo-url> ecole-saas
cd ecole-saas

# Activer la bonne version de Node
fnm use   # ou: nvm use

# Installer les dépendances du monorepo
pnpm install

# Préparer les variables d'environnement
cp .env.example .env
# Génère des secrets JWT >= 256 bits :
#   openssl rand -base64 48   (deux fois, pour JWT_ACCESS_SECRET et JWT_REFRESH_SECRET)
# Et reporte-les dans .env

# Démarrer Postgres (Vague 1+)
docker compose up -d
docker compose ps   # postgres doit être "healthy"

# Appliquer le schéma Prisma (Vague 1+)
pnpm --filter=@ecole-saas/api prisma migrate dev
pnpm --filter=@ecole-saas/api prisma db seed

# Lancer web + api en parallèle
pnpm dev
```

| Service | URL                                              |
| ------- | ------------------------------------------------ |
| Web     | [http://localhost:3000](http://localhost:3000)   |
| API     | [http://localhost:4000](http://localhost:4000)   |
| Swagger | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| Health  | [http://localhost:4000/health](http://localhost:4000/health)     |

### Arrêter / nettoyer

```bash
docker compose down              # arrête postgres (données conservées)
docker compose down -v           # arrête + supprime le volume (RAZ totale)
```

### Commandes disponibles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance tous les serveurs de dev en parallèle |
| `pnpm build` | Build production de toutes les apps |
| `pnpm lint` | Lint tout le monorepo |
| `pnpm type-check` | Vérifie les types TypeScript |
| `pnpm test` | Lance les tests |
| `pnpm format` | Formate avec Prettier |
| `pnpm clean` | Supprime tous les `node_modules` et `dist` |

---

## 🔄 CI/CD

### GitHub Actions

Deux workflows automatiques :

- **`ci.yml`** — Lint + Type-check + Build à chaque PR et push sur `main`/`develop`
- **`deploy-web.yml`** — Déploiement production sur Vercel à chaque push sur `main`

### Secrets GitHub à configurer

Dans **Settings → Secrets and variables → Actions** de votre repo :

| Secret | Description | Où le trouver |
|--------|-------------|---------------|
| `VERCEL_TOKEN` | Token d'API Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | ID de votre organisation Vercel | `.vercel/project.json` après `vercel link` |
| `VERCEL_PROJECT_ID` | ID du projet Vercel | `.vercel/project.json` après `vercel link` |

---

## ☁️ Setup Vercel (1ère fois)

```bash
# Installer Vercel CLI
pnpm add -g vercel

# Se connecter
vercel login

# Lier le projet (à faire dans apps/web)
cd apps/web
vercel link

# Récupérer org-id et project-id générés
cat .vercel/project.json
```

Copiez les valeurs dans les secrets GitHub.

**Important** : Dans le dashboard Vercel du projet :
- **Root Directory** = `apps/web`
- **Framework Preset** = Next.js
- **Build Command** = (laisser vide, géré par `vercel.json`)

---

## 🌊 Roadmap des Vagues

| Vague | Contenu | Statut |
|-------|---------|--------|
| **0** | Monorepo + CI/CD + Hello World déployé | ✅ |
| **1** | Backend NestJS + Auth multi-tenant + PostgreSQL | 🚧 |
| **2** | App Mobile Expo + Module Élèves | 🚧 |
| **3** | Module Parents + Communication (Slack-like) | 🚧 |
| **4** | RH + Paie + Enseignants | 🚧 |
| **5** | Stock + Cantine + Transport | 🚧 |
| **6** | Finance + Facturation + Paiements en ligne | 🚧 |
| **7** | Module Pédagogique + Évaluations + Bulletins | 🚧 |
| **8** | Notifications push + WhatsApp/SMS | 🚧 |

Chaque vague = livrable testable et déployé en production.

---

## 📝 Conventions

### Branches
- `main` → production (auto-deploy)
- `develop` → staging
- `feature/*` → features
- `fix/*` → bugfixes

### Commits
Convention [Conventional Commits](https://www.conventionalcommits.org/) :
```
feat(web): add login page
fix(api): correct tenant isolation bug
chore: bump dependencies
```

---

## 🤝 Stack technique complète

**Frontend Web** : Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui (Vague 1+)
**Mobile** : Expo SDK 51 · React Native · Expo Router · NativeWind
**Backend** : NestJS 10 · Prisma · PostgreSQL 16 · Redis · BullMQ
**Auth** : JWT + Refresh tokens · NextAuth.js (web)
**Infrastructure** : Vercel (web) · Railway/Render (api) · Neon (db) · Upstash (redis)
**Monitoring** : Sentry · PostHog (analytics)
**Email** : Resend
**Stockage fichiers** : Cloudflare R2 / AWS S3

---

## 📄 Licence

Propriétaire — Tous droits réservés.
