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

- **Node.js** ≥ 20.0.0 (utilisez `nvm use` pour respecter `.nvmrc`)
- **pnpm** ≥ 9.0.0 → `npm install -g pnpm`

### Installation

```bash
git clone <votre-repo-url>
cd ecole-saas

# Installer toutes les dépendances du monorepo
pnpm install

# Copier les variables d'environnement
cp .env.example .env.local

# Lancer le serveur de dev (Web uniquement pour Vague 0)
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

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
