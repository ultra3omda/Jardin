# CLAUDE.md

> **Ce fichier est lu automatiquement par Claude Code au démarrage de chaque session dans ce repo.**
> Il contient le contexte projet, les standards de qualité et la méthode de travail. Ne pas le supprimer.

---

## 🎯 Mission du projet

**École SaaS** — Plateforme SaaS multi-tenant de gestion complète pour écoles primaires et jardins d'enfants.

**Cible** : marché international (FR, EN, AR, ES), modèle B2B avec abonnement mensuel/annuel par établissement.

**Produits livrables** :
1. **Application Web** (back-office direction/admin) — Next.js 14
2. **Application Mobile iOS/Android** (3 apps : Parent / Enseignant / Direction) — Expo
3. **API Backend** multi-tenant — NestJS + PostgreSQL

**Modules fonctionnels couverts** (sur la roadmap complète) :
Élèves · Parents · Enseignants · Personnel · RH/Paie · Pédagogie/Évaluations/Bulletins · Communication · Finance/Facturation · Stock/Maintenance · Cantine · Transport · Santé · Sécurité · Notifications multi-canal · Reporting · Admin SaaS multi-tenant.

---

## 🏗️ Architecture & Stack technique

### Monorepo
- **Turborepo** + **pnpm workspaces**
- Structure :
  ```
  apps/web      → Next.js 14 (App Router) — back-office
  apps/mobile   → Expo SDK 51 / React Native — 3 apps fusionnées
  apps/api      → NestJS 10 — REST + WebSocket
  packages/shared           → types & utils partagés (single source of truth)
  packages/typescript-config → tsconfig partagés
  packages/eslint-config    → configs lint partagées (à créer)
  packages/ui-web           → composants shadcn/ui custom (Vague 1+)
  packages/ui-mobile        → composants React Native partagés (Vague 2+)
  ```

### Stack
- **Frontend Web** : Next.js 14 App Router · TypeScript strict · Tailwind CSS · shadcn/ui · TanStack Query · Zustand · next-intl
- **Mobile** : Expo SDK 51 · React Native · Expo Router · NativeWind · Zustand · TanStack Query · Expo Notifications
- **Backend** : NestJS 10 · Prisma ORM · PostgreSQL 16 · Redis (cache+queues) · BullMQ · Socket.IO · class-validator
- **Auth** : JWT access (15min) + refresh tokens (30j) · bcrypt · RBAC granulaire par tenant
- **Multi-tenant** : Row-Level Security PostgreSQL + tenant_id obligatoire sur tous les modèles · middleware NestJS d'isolation
- **i18n** : next-intl (web) · i18next + expo-localization (mobile) · fichiers JSON par locale
- **Observability** : Sentry · Pino logs · OpenTelemetry traces
- **Email** : Resend
- **SMS** : Twilio (avec fallback local par pays)
- **Storage fichiers** : Cloudflare R2 (S3-compatible)
- **Paiements** : Stripe (international) + Konnect/Paymee (Tunisie/MENA)

### Hébergement
- **Web** : Vercel (projet `jardin`, team `ultra3omda-6664s-projects`)
- **API** : Railway ou Render
- **PostgreSQL** : Neon (avec branching pour preview deploys)
- **Redis** : Upstash
- **CI/CD** : GitHub Actions
- **Monitoring** : Sentry + Better Stack (Logtail + Uptime)

---

## 📍 État actuel du projet

### ✅ Vague 0 — Fondations (LIVRÉE)
- Monorepo Turborepo configuré
- App web Next.js 14 "Hello World" avec Tailwind
- Package `@ecole-saas/shared` avec types Tenant, User, Locale, ApiResponse
- GitHub Actions CI (lint + type-check + build)
- GitHub Actions Deploy → Vercel
- Endpoint `/api/health`
- Documentation : `README.md` + `SETUP.md`
- Projet Vercel `jardin` lié (projectId `prj_0HusykA4lbXZR9nSRIUFhCrxtbU6`)

### 🚧 Vague 1 — En cours (à exécuter)
Voir section **"Travail à effectuer"** ci-dessous.

### 📋 Vagues 2-8 — Backlog (ne PAS commencer sans validation utilisateur)
Voir section **"Roadmap des vagues suivantes"**.

---

## ⭐ Standards de qualité (NON NÉGOCIABLES)

Le code livré doit être **production-ready**, pas un prototype. Cela signifie :

### Qualité du code
- ✅ TypeScript **strict** (pas de `any`, pas de `// @ts-ignore`)
- ✅ ESLint sans warnings (sauf justification dans le PR)
- ✅ Prettier appliqué partout
- ✅ Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- ✅ Pas de console.log en prod — utiliser le logger structuré (Pino côté API, console côté web/mobile mais avec un wrapper)
- ✅ Pas de magic numbers / strings — constantes nommées dans `@ecole-saas/shared`
- ✅ Fichiers < 300 lignes (split sinon)
- ✅ Fonctions < 50 lignes
- ✅ Naming en anglais (code) — UI/contenu en FR par défaut

### Tests (obligatoires pour chaque vague)
- ✅ Tests unitaires sur la logique métier (Vitest pour web/api/shared, Jest pour mobile)
- ✅ Tests d'intégration sur les endpoints API critiques (auth, multi-tenant isolation)
- ✅ Tests E2E sur les parcours critiques (Playwright pour web, Maestro pour mobile)
- ✅ Coverage minimum **70%** sur le code applicatif (hors UI pure)

### Sécurité (obligatoire)
- ✅ Tous les secrets en variables d'environnement (jamais commités)
- ✅ Validation d'entrée sur **tous** les endpoints API (Zod ou class-validator)
- ✅ Rate limiting global + par endpoint sensible
- ✅ CORS configuré strictement (whitelist domaines)
- ✅ CSP headers sur web
- ✅ Helmet sur API
- ✅ bcrypt rounds ≥ 12
- ✅ JWT secret ≥ 256 bits, rotation possible
- ✅ Pas de PII dans les logs
- ✅ HTTPS only en production
- ✅ Sessions invalidables côté serveur (refresh token rotation)
- ✅ Isolation multi-tenant **vérifiée par test automatique** (un tenant ne peut JAMAIS lire les données d'un autre)
- ✅ RGPD-ready : endpoint d'export et de suppression de données par utilisateur

### Accessibilité & UX
- ✅ Conformité **WCAG 2.1 niveau AA** sur web
- ✅ Labels ARIA sur tous les composants interactifs
- ✅ Navigation clavier complète sur web
- ✅ Contraste ≥ 4.5:1 sur le texte
- ✅ Support du mode sombre
- ✅ États de chargement explicites (skeletons, pas juste spinners)
- ✅ États d'erreur avec retry possible
- ✅ États vides informatifs (pas juste "Aucune donnée")

### Documentation
- ✅ README dans chaque package
- ✅ JSDoc sur les fonctions publiques exportées
- ✅ Swagger/OpenAPI auto-généré côté API
- ✅ ADR (Architecture Decision Records) dans `docs/adr/` pour décisions structurantes
- ✅ Schéma de BDD documenté (auto via Prisma)
- ✅ Diagramme d'architecture mis à jour (`docs/architecture.md`)

### Performance
- ✅ Lighthouse mobile ≥ 90 sur la home et le login
- ✅ Time to Interactive < 3s sur 3G
- ✅ Bundle size monitoré (alerte si +20%)
- ✅ Index sur toutes les colonnes filtrables côté DB
- ✅ Pagination obligatoire sur toutes les listes (cursor-based de préférence)
- ✅ Cache Redis sur les queries chères (TTL réfléchi)

---

## 🛠️ Méthode de travail

### Principes fondamentaux
1. **Vagues incrémentales** — chaque vague = livrable de 1-3 jours, testable et déployable
2. **Trunk-based light** — branche `main` (prod) + feature branches courtes (< 2j) + PRs
3. **TDD quand pertinent** — pour la logique métier critique (auth, multi-tenant, paie)
4. **Pas de spéculation** — ne pas anticiper des besoins non confirmés
5. **Préférer la simplicité** — pas d'over-engineering, YAGNI

### Workflow par vague
```
1. Lire CLAUDE.md (toujours)
2. Confirmer la vague en cours et son scope avec l'utilisateur
3. Proposer un plan détaillé (fichiers à créer/modifier, ordre, tests)
4. Attendre validation explicite avant de coder
5. Coder par sous-tâche avec commits atomiques (Conventional Commits)
6. Tester localement à chaque étape (pnpm dev, pnpm test, pnpm build)
7. À la fin : récap des changements + ouvrir une PR vers main
8. Attendre que toute la CI passe verte (lint + type + build + tests + e2e)
9. CI verte → MERGE AUTOMATIQUE de la PR (`gh pr merge <N> --merge`)
   — ne PAS attendre d'OK explicite pour le merge tant que la CI est verte.
   Stratégie : merge commit (préserve l'historique granulaire des feature branches).
10. STOP — ne JAMAIS commencer la vague suivante sans validation utilisateur
    (le merge auto ferme la vague, mais le scope de la suivante reste à l'utilisateur)
```

> **Note (politique locked 2026-05-22)** : la règle 9 (merge auto sur CI verte)
> remplace l'ancien "attendre l'OK utilisateur pour merger". Exceptions qui
> nécessitent toujours validation explicite : `git push --force` ou réécriture
> d'historique public, modif `.github/workflows/`, ajout de dep >100 KB gzipped
> ou avec poids sécurité, coût récurrent >$50/mois, conflit avec CLAUDE.md.

### Checkpoints obligatoires (s'ARRÊTER et demander)
- 🛑 Avant tout `git push --force` ou modification de l'historique
- 🛑 Avant de supprimer un fichier > 100 lignes
- 🛑 Avant d'ajouter une nouvelle dépendance majeure (> 100kb gzipped ou critique sécurité)
- 🛑 Avant de modifier le schéma Prisma (migration)
- 🛑 Avant de modifier `.github/workflows/`
- 🛑 Avant de modifier `package.json` racine
- 🛑 Avant tout changement qui impacte la facturation/paiement
- 🛑 Avant de toucher au code multi-tenant (isolation)
- 🛑 Avant de finir une vague (récap obligatoire)

### Commandes essentielles
```bash
pnpm install              # install monorepo
pnpm dev                  # lance tous les dev servers
pnpm dev --filter=web     # juste le web
pnpm build                # build complet
pnpm lint                 # lint tout
pnpm type-check           # type-check tout
pnpm test                 # tests tout
pnpm test --filter=api    # tests API seulement
pnpm format               # prettier sur tout
```

### Utilisation des skills (très important)

Claude Code a accès aux skills suivants — **les utiliser quand pertinent** :

| Skill | Quand l'utiliser |
|---|---|
| `frontend-design` | **OBLIGATOIRE** dès qu'on touche à de l'UI/UX (web ou mobile). Lire ce skill avant toute création de composant. |
| `product-self-knowledge` | Pour toute question sur Claude/Anthropic produits (rare ici) |
| `docx`/`pptx`/`xlsx`/`pdf` | Si l'utilisateur demande des livrables documentaires |
| `skill-creator` | Si on identifie un pattern récurrent à factoriser en skill projet |

**Ne pas réinventer ce qui est dans un skill.** Toujours faire `view /mnt/skills/public/<skill>/SKILL.md` avant d'attaquer un sujet couvert.

---

## 🌊 Vague en cours : Vague 1 — Backend Auth + Multi-tenant

### Objectif
Mettre en place l'API NestJS avec authentification JWT, isolation multi-tenant stricte, et brancher le web sur une page de login fonctionnelle.

### Scope précis
1. **Setup `apps/api`** (NestJS 10 + Prisma + PostgreSQL)
   - Dockerfile pour Postgres local
   - Schema Prisma avec modèles : `Tenant`, `User`, `RefreshToken`, `AuditLog`
   - Migrations Prisma initiales
   - Seeds avec 2 tenants de demo + admins
2. **Module Auth**
   - `POST /auth/register` (inscription d'un tenant + admin initial)
   - `POST /auth/login` (email + password → access + refresh tokens)
   - `POST /auth/refresh` (rotation des refresh tokens)
   - `POST /auth/logout` (invalidation)
   - `GET /auth/me` (user courant)
   - Guards JWT + RBAC
3. **Middleware multi-tenant**
   - Extraction du `tenantId` depuis le JWT
   - Injection automatique dans toutes les queries Prisma (middleware Prisma)
   - Test d'isolation : un user du tenant A ne DOIT JAMAIS pouvoir lire les données du tenant B
4. **Web : pages d'auth**
   - `/login` — formulaire email/password
   - `/register` — création d'un nouvel établissement
   - Layout `(auth)` dédié
   - Hook `useAuth` avec stockage refresh token sécurisé
   - Redirection `/dashboard` (placeholder) après login
   - Page `/dashboard` minimale qui affiche les infos du tenant connecté
5. **Tests obligatoires**
   - Tests unitaires sur la logique d'auth
   - Tests d'intégration sur `/auth/*`
   - Test E2E Playwright : register → login → dashboard
   - **Test d'isolation multi-tenant** (test critique)
6. **Documentation**
   - `apps/api/README.md` (setup local, env vars, migrations)
   - Swagger auto-généré accessible sur `/api/docs`
   - ADR `docs/adr/0001-auth-strategy.md`

### Critères d'acceptation Vague 1
- [ ] `pnpm dev` lance web + api en parallèle sans erreur
- [ ] `docker compose up -d` démarre Postgres
- [ ] `pnpm --filter=api prisma migrate dev` passe
- [ ] `pnpm --filter=api prisma db seed` crée les tenants de demo
- [ ] Curl `POST /auth/login` avec un user de demo retourne des tokens valides
- [ ] Le web peut faire un login complet et afficher le dashboard
- [ ] **Test d'isolation multi-tenant passe** (test critique)
- [ ] `pnpm test` passe (coverage ≥ 70% sur api/src/auth et api/src/tenant)
- [ ] `pnpm lint && pnpm type-check && pnpm build` passe
- [ ] CI GitHub Actions verte
- [ ] Deploy preview Vercel fonctionne
- [ ] Swagger docs accessibles
- [ ] README API à jour
- [ ] Commits propres (Conventional Commits)

### Variables d'environnement à ajouter
À ajouter dans `.env.example` (sans valeurs réelles) :
```env
# API
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecole_saas"
JWT_ACCESS_SECRET="<256-bit-random>"
JWT_REFRESH_SECRET="<256-bit-random>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"
BCRYPT_ROUNDS="12"
API_PORT="4000"
CORS_ORIGIN="http://localhost:3000"

# Web
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### Choix techniques imposés pour cette vague
- **ORM** : Prisma (pas TypeORM)
- **Validation** : class-validator + class-transformer (côté API), Zod (côté web)
- **Tokens** : JWT signed avec RS256 ou HS256 (HS256 OK pour MVP)
- **Mot de passe** : bcrypt rounds 12 minimum
- **Refresh token storage** : table `RefreshToken` en DB (rotation à chaque usage)
- **Format ID** : `cuid2` (pas UUID, pas auto-increment)

### Ce qu'on NE FAIT PAS dans cette vague
- ❌ Pas d'OAuth/SSO (Vague ultérieure)
- ❌ Pas de 2FA (Vague 4+)
- ❌ Pas de récupération de mot de passe par email (Vague 1.5)
- ❌ Pas de page "Profil utilisateur" complète (Vague 2)
- ❌ Pas de gestion d'élèves (Vague 2)
- ❌ Pas de design system complet (juste les composants nécessaires)

---

## 📋 Roadmap des vagues suivantes (NE PAS COMMENCER SANS VALIDATION)

| Vague | Scope | Durée estimée |
|---|---|---|
| **1.5** | Récupération mot de passe + Vérification email + Page profil | 1j |
| **2** | App Mobile Expo (setup + login) + Module Élèves (CRUD complet web+mobile) | 3j |
| **3** | Module Parents + Relations parent-élève + Communication 1:1 | 2j |
| **4** | Module Enseignants + Classes + Emploi du temps | 3j |
| **5** | RH (contrats, congés, présence) + Paie (calcul de base) | 3j |
| **6** | Pédagogie : Notes, Évaluations, Bulletins, Rapports | 3j |
| **7** | Finance : Facturation parents, paiements en ligne (Stripe + local) | 3j |
| **8** | Stock, Cantine, Transport, Santé, Sécurité | 3j |
| **9** | Notifications multi-canal (push, email, SMS, WhatsApp) | 2j |
| **10** | Admin SaaS : super-admin, billing tenants, analytics plateforme | 2j |
| **11** | Hardening : observability, performance, sécurité avancée, audit | 2j |
| **12** | Mobile : finalisation 3 apps + build EAS + soumission stores | 3j |

---

## 📞 Informations utilisateur

- **OS local** : Windows (PowerShell)
- **Chemin projet** : `C:\Users\ultra\Desktop\Projets\ecole-saas`
- **Repo GitHub** : à confirmer
- **Vercel project** : `jardin` (team `ultra3omda-6664s-projects`)
- **Vercel projectId** : `prj_0HusykA4lbXZR9nSRIUFhCrxtbU6`
- **Vercel orgId** : `team_yG29YmhWprcc7vjtWOuLN4BN`
- **Préférence** : code complet généré (workflow copier-coller), pas d'apprentissage step-by-step
- **Langue de communication** : français
- **Langue du code** : anglais

---

## ⚠️ Choses à NE JAMAIS faire

- ❌ Ne JAMAIS commiter de secrets (`.env`, tokens, clés API)
- ❌ Ne JAMAIS désactiver TypeScript strict ou un règle ESLint sans justification écrite
- ❌ Ne JAMAIS modifier l'historique git public (`push --force` sur `main`)
- ❌ Ne JAMAIS contourner l'isolation multi-tenant (même "temporairement pour tester")
- ❌ Ne JAMAIS livrer une vague sans tests
- ❌ Ne JAMAIS commencer une vague sans validation explicite de l'utilisateur
- ❌ Ne JAMAIS ajouter une dépendance pour un besoin qui peut être codé en 20 lignes
- ❌ Ne JAMAIS introduire un breaking change dans `@ecole-saas/shared` sans mettre à jour tous les consumers
- ❌ Ne JAMAIS faire de "petite refacto opportuniste" non liée à la vague en cours
- ❌ Ne JAMAIS supposer le contexte — demander si doute

---

## ✅ Comment démarrer chaque session Claude Code

À chaque nouvelle session, commencer par :
1. Lire ce `CLAUDE.md` en entier (auto)
2. Faire `git status` et `git log --oneline -10` pour comprendre l'état
3. Demander à l'utilisateur : *"Je vois qu'on est sur la Vague X. Tu veux qu'on continue où on en était (faire `git status`) ou qu'on attaque la suite ?"*
4. Attendre la confirmation avant d'agir
