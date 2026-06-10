# CLAUDE.md

> **Ce fichier est lu automatiquement par Claude Code au démarrage de chaque session dans ce repo.**
> Il contient le contexte projet, les standards de qualité et la méthode de travail. Ne pas le supprimer.
> **Dernière mise à jour : 2026-06-10** (synchronisé avec l'état réel du repo, PR #138 mergée).

---

## 🎯 Mission du projet

**Klasso** (`klasso.tn`) — SaaS multi-tenant de gestion complète pour écoles primaires et jardins d'enfants.

- **Positionnement** : « Le SaaS qui rassemble Direction, Enseignants et Parents — déployable en 24h, sans IT. »
- **Cible** : Tunisie/MENA prioritaire + FR. B2B, abonnement par établissement (tiers en TND, paiement ClicToPay).
- **Branding** : le produit s'appelle **Klasso** (locked 2026-05-24). Le code et les packages gardent le naming historique `ecole-saas` (`@ecole-saas/*`) — pas de rebranding code prévu. Exceptions : `@klasso/mobile`, `@klasso/ui-mobile`, bundle IDs `tn.klasso.app`.

**Produits livrés** :
1. **Web** (back-office tous rôles + landing publique FR/AR) — Next.js 14 — `https://ecole-saas.vercel.app` + `klasso.tn`
2. **Mobile** iOS/Android (1 app Expo, personas parent/enseignant/admin) — `klasso-mobile.vercel.app` (build web) + EAS pour les stores
3. **API** multi-tenant — NestJS — `https://api.klasso.tn` (Railway)

---

## 🏗️ Architecture & Stack technique (état réel)

### Monorepo
- **Turborepo 2** + **pnpm 9.12.0** (Node ≥ 20)
- Structure réelle :
  ```
  apps/web      → Next.js 14.2 (App Router) · React 18 — back-office + landing
  apps/mobile   → Expo SDK 54 · React Native 0.81 · React 19 — 1 app, 3 personas
  apps/api      → NestJS 10 · Prisma 5.20 — REST + Socket.IO
  packages/shared            → @ecole-saas/shared — types & locales partagés
  packages/typescript-config → tsconfigs partagés
  packages/ui-mobile         → @klasso/ui-mobile — composants RN + design tokens
  ```
- ⚠️ **Versions React isolées** : web/api restent sur React 18, mobile est sur React 19 (Expo 54). Ne pas "harmoniser".

### Stack
- **Web** : Next.js 14 App Router · TS strict · Tailwind · shadcn/Radix · TanStack Query · Zustand · react-hook-form + Zod · next-intl v4 (`[locale]` sub-paths, fr/en/ar/es + RTL)
- **Mobile** : Expo SDK 54 · Expo Router 6 · NativeWind 4 · Zustand + TanStack Query · expo-secure-store · i18next · New Architecture + Hermes (worklets/reanimated 4 — ne PAS repasser en JSC)
- **API** : NestJS 10 · Prisma 5 · PostgreSQL 16 · class-validator · Pino (redaction PII) · Helmet + Throttler · Swagger `/api/docs` · Socket.IO (`/messaging`, handshake JWT)
- **Auth** : JWT HS256 access 15min + refresh 30j (rotation en DB, détection de réutilisation) · bcrypt 12 · Rôles : `SUPER_ADMIN, COMMERCIAL, SCHOOL_ADMIN, TEACHER, PARENT, STAFF`
- **Multi-tenant** : `tenantId` sur tous les modèles scoped + `TenantContextService` (AsyncLocalStorage) + extension Prisma qui injecte le filtre automatiquement. **L'extension est câblée globalement dans `PrismaService` (proxy constructeur)** — le client injecté par tous les services EST le client gardé, y compris dans `$transaction`. La liste `TENANT_SCOPED_MODELS` est vérifiée par un test garde-fou (`tenant-scoped-models.spec.ts`) qui échoue en CI si un modèle avec `tenantId` n'y figure pas (ou dans `TENANT_SCOPED_EXCEPTIONS` documenté). Test d'isolation e2e obligatoire pour CHAQUE nouvelle table tenant-scoped (risque R10).
- **White-label** : `Tenant.brand` JSON (logo R2, couleurs) injecté en CSS vars post-auth + routes pré-auth `/t/[slug]/*`. Middleware subdomain `*.klasso.tn` écrit mais gated (`ENABLE_SUBDOMAIN_RESOLVER`).
- **Services** : Resend (email) · Cloudflare R2 (photos, exports, assets tenants) · Expo Push · **Orange Tunisie SMS** (pas Twilio) · **ClicToPay** (paiements TND — Stripe/Konnect non intégrés à ce jour) · Cloudflare Turnstile (anti-bot landing) · Sentry

### Hébergement & déploiement
- **Web** : Vercel projet `ecole-saas` → déployé par `.github/workflows/deploy-web.yml` (Vercel CLI **pinné 54.6.1**, deploy `--archive=tgz` pour la limite Hobby)
- **Mobile web** : Vercel projet `klasso-mobile` (`expo export --platform web`) → `deploy-mobile.yml`
- **API** : Railway (auto-deploy sur push main, `prisma migrate deploy` au boot) → `api.klasso.tn`
- **DB** : Neon PostgreSQL · **Stores** : EAS Build/Submit (profils dans `eas.json`, API URL = `api.klasso.tn`)
- Workflows annexes : `seed-prod.yml` (re-seed démo manuel), `reset-super-admin.yml`, `purge-demo-fixtures.yml`
- **Règle cloud-first (D22)** : toute fonctionnalité doit être visible via une URL cloud sans setup local. Avant d'ajouter un Dockerfile/config deploy, vérifier l'existant (`curl https://api.klasso.tn/health` + roadmap).

---

## 📍 État actuel du projet (2026-06-10)

Le projet est en **phase GTM/consolidation** — bien au-delà de la roadmap initiale. Livré en prod :

### Modules livrés (API + web, la plupart aussi sur mobile)
- **Socle** : auth complète (login, register invite-only, reset password, verif email), multi-tenant + isolation testée, white-label, RGPD export
- **Scolarité** : Élèves (CRUD + photo R2 + import CSV/Excel générique) · Classes + affectations enseignants + EDT (grille hebdo, vue par enseignant) · Matières/coefficients · Périodes · Évaluations/Notes (saisie auto-save) · Bulletins PDF (@react-pdf) · Devoirs/TAF + rendus · Présences/Absences
- **Vie scolaire** : Journal quotidien (repas, sieste, humeur, photo du jour) · Ateliers/Activités · Discipline · Santé (carnet, infirmerie, vaccins) · Cantine (menus, régimes) · Transport (lignes, arrêts, affectations) · Sécurité (incidents, visiteurs, exercices)
- **Relations & communication** : Parents↔Élèves N-N · Messagerie 1:1 Socket.IO · Annonces · Notifications (push Expo + email + SMS Orange)
- **RH/Finance** : Contrats, congés, paie (fiches TND) · Facturation parents · Abonnements SaaS + checkout ClicToPay
- **Plateforme** : Console super-admin (tenants, invites, audit, analytics MRR/ARR réels, purge démo) · Pipeline commercial + onboarding organisation · Demo-login 1-clic self-healing + seeds démo tunisiens (cf. `docs/DEMO_CREDENTIALS.md`, `docs/demo-scenarios.md`)
- **Design** : système V7 "Médina" (navy/terracotta/cream, Fraunces + Public Sans + Markazi Text), landing bilingue FR/AR, responsive mobile, accent corail partagé web/mobile

### Travaux les plus récents (juin 2026)
- Vue **PARENT** complète et scopée à ses enfants (dashboard, EDT, notes, bulletins téléchargeables, paiements, absences) — PR #128-134
- **Préparation publication stores** : icônes, app.json, guide (PR #135) puis **upgrade Expo SDK 51 → 54** (PR #137-138)
- Derniers commits sur main : fixes du build mobile web sur Vercel (assets `.pnpm`, autolinking reanimated/worklets)

### Prochaines étapes probables (à confirmer avec l'utilisateur)
- Soumission stores réelle (EAS Submit — credentials Apple/Google à fournir)
- Activation subdomain wildcard `*.klasso.tn` (V1.7-B, bloquée par DNS/OVH — voir D25)
- Hardening (Postgres RLS, CSP, Better Stack, backups), branches en attente (`feat/billing-ui-clictopay`, `claude/super-admin-access-workflow`, …)

### Sources de vérité
- **`docs/roadmap.md`** — roadmap master + décisions lockées D1-D27. ⚠️ Historique tenu à jour jusqu'au 2026-05-27 seulement ; pour l'état réel après cette date, faire foi à `gh pr list --state merged` (PR #79 → #138 : tracks T2a-T2d, GTM, parent app, SDK 54).
- **`docs/adr/`** — 16 ADRs (auth, white-label, mobile, messaging, EDT, bulletins, design system, admin SaaS, onboarding commercial…)
- **`docs/architecture.md`**, **`docs/GUIDE_UTILISATION.md`**, **`docs/MOBILE_WEB_DEPLOY.md`**, **`docs/deploy/`**, **`docs/payments/clictopay-recette.md`**, **`docs/notifications/orange-sms.md`**

---

## ⭐ Standards de qualité (NON NÉGOCIABLES)

Le code livré doit être **production-ready**, pas un prototype.

### Qualité du code
- ✅ TypeScript **strict** (pas de `any`, pas de `// @ts-ignore`)
- ✅ ESLint sans warnings · Prettier partout · Conventional Commits
- ✅ Pas de console.log en prod (Pino côté API, wrapper côté web/mobile)
- ✅ Pas de magic numbers/strings — constantes nommées (`@ecole-saas/shared` si partagé)
- ✅ Fichiers < 300 lignes, fonctions < 50 lignes
- ✅ Naming en anglais (code) — UI/contenu en FR par défaut (i18n fr/en/ar/es)

### Tests (obligatoires pour chaque livraison)
- ✅ Unit : Vitest (web/api/shared), Jest (mobile) — l'API a ~46 specs, le harnais existe partout
- ✅ Intégration/e2e API : Vitest `.e2e-spec.ts` dans `apps/api/test/` (~25 specs) — tout nouveau module métier ajoute la sienne
- ✅ E2E web : Playwright · E2E mobile : Maestro (prévu, pas encore configuré)
- ✅ Coverage ≥ **70%** sur le code applicatif (hors UI pure)
- ✅ **Test d'isolation multi-tenant pour chaque nouvelle table tenant-scoped** (`multi-tenant-isolation.e2e-spec.ts`) — critique, risque R10

### Sécurité
- ✅ Secrets en env vars uniquement (jamais commités) · validation d'entrée sur TOUS les endpoints (class-validator API, Zod web)
- ✅ Rate limiting (Throttler global + endpoints sensibles) · CORS whitelist · Helmet · CSP web
- ✅ bcrypt ≥ 12 · JWT secrets ≥ 32 chars (vérifiés au boot) · refresh rotation + invalidation serveur
- ✅ Pas de PII dans les logs (redaction Pino) · RGPD : export/suppression par utilisateur
- ✅ Ne JAMAIS contourner l'isolation multi-tenant, même « temporairement pour tester »

### Accessibilité & UX
- ✅ WCAG 2.1 AA web · ARIA sur tout l'interactif · navigation clavier · contraste ≥ 4.5:1
- ✅ États de chargement (skeletons), erreur (avec retry), vide (informatif)

### Documentation
- ✅ Swagger auto-généré (`/api/docs`) · ADR dans `docs/adr/` pour toute décision structurante · `docs/roadmap.md` mis à jour en fin de vague

### Performance
- ✅ Pagination sur toutes les listes · index sur les colonnes filtrables · Lighthouse mobile ≥ 90 (home/login)

---

## 🛠️ Méthode de travail

### Principes
1. **Vagues incrémentales** — chaque vague = livrable 1-3j, testable et déployable, avec spec/plan dans `docs/superpowers/`
2. **Trunk-based light** — `main` (prod, auto-deploy) + feature branches courtes + PRs
3. **TDD quand pertinent** (auth, multi-tenant, paie) · **YAGNI** · pas de spéculation

### Workflow par vague
```
1. Lire CLAUDE.md (toujours)
2. Confirmer le scope avec l'utilisateur
3. Proposer un plan détaillé (fichiers, ordre, tests)
4. Attendre validation explicite avant de coder
5. Coder par sous-tâche avec commits atomiques
6. Tester localement (pnpm test, pnpm build) — push = deploy prod après merge !
7. Récap + ouvrir une PR vers main
8. Attendre la CI verte (lint + type + build + tests + e2e)
9. CI verte → MERGE AUTOMATIQUE (`gh pr merge <N> --merge`)
   — ne PAS attendre d'OK explicite tant que la CI est verte (politique locked 2026-05-22).
10. STOP — ne JAMAIS commencer la vague suivante sans validation utilisateur
```

> Exceptions à la règle 9 (validation explicite TOUJOURS requise) : `git push --force` /
> réécriture d'historique, modif `.github/workflows/`, dep >100 KB gzipped ou sensible
> sécurité, coût récurrent >$50/mois, conflit avec CLAUDE.md.

### Checkpoints obligatoires (s'ARRÊTER et demander)
- 🛑 `git push --force` / réécriture d'historique
- 🛑 Suppression d'un fichier > 100 lignes
- 🛑 Nouvelle dépendance majeure (> 100kb gzipped ou critique sécurité)
- 🛑 Modification du schéma Prisma (migration) — toujours backward-compat, soft-delete plutôt que drop
- 🛑 Modification `.github/workflows/` ou `package.json` racine
- 🛑 Tout ce qui touche facturation/paiement ou au code d'isolation multi-tenant
- 🛑 Fin de vague (récap obligatoire)

### Commandes essentielles
```bash
pnpm install                    # install monorepo
pnpm dev                        # tous les dev servers
pnpm dev --filter=@ecole-saas/web
pnpm build / lint / type-check / test / format
pnpm --filter=@ecole-saas/api test          # tests API
docker compose up -d                        # Postgres local
pnpm --filter=@ecole-saas/api prisma migrate dev
gh workflow run seed-prod.yml               # re-seed démo prod (manuel)
```

### Skills
| Skill | Quand |
|---|---|
| `frontend-design` | **OBLIGATOIRE** avant toute création/refonte UI (web ou mobile) — respecter le design system V7 (`docs/design-system.md`, ADR 0013/0014) |
| `superpowers:*` (brainstorming, writing-plans, executing-plans…) | Le pattern specs/plans dans `docs/superpowers/` vient de là |
| `docx`/`pptx`/`xlsx`/`pdf` | Livrables documentaires |

---

## ⚠️ Gotchas connus (acquis à la dure — ne pas re-découvrir)

- **Git sous Cursor (Windows)** : l'env injecte un `GIT_ASKPASS` cassé → les push/pull échouent (« unable to read askpass response »). Contournement : `Remove-Item Env:GIT_ASKPASS` dans le même appel shell, et si besoin auth via token `gh` en header (`git -c http.extraheader="AUTHORIZATION: basic <b64(x-access-token:TOKEN)>"`). `gh` est authentifié (compte `ultra3omda`).
- **Vercel CLI pinné 54.6.1** dans `deploy-web.yml` (54.7.0 casse le build) + deploy `--archive=tgz` (limite upload Hobby).
- **Vercel et les dot-directories** : Vercel ne sert pas les dossiers `.pnpm`/dot-dirs — les assets du build Expo web sont « de-dottés » (cf. commits `0a8b197`, `033f861`).
- **Mobile = Hermes + New Architecture obligatoires** (reanimated 4/worklets ont besoin de SharedArrayBuffer). `react-native-reanimated` et `react-native-worklets` doivent rester en deps directes (autolinking iOS).
- **pnpm + Metro** : `node-linker` + `public-hoist-pattern` réglés dans `.npmrc` pour que Metro résolve en monorepo. Ne pas toucher sans tester `expo export`.
- **React 18 (web/api) vs React 19 (mobile)** : isolation volontaire depuis le passage SDK 54 (PR #137).
- **Next 14 + refresh rotation** : le layout `(app)` est volontairement Client Component (la rotation V1.5 est incompatible RSC — fix boucle infinie, PR #13). Ne pas « optimiser » en Server Component.
- **Démo** : comptes et données dans `docs/DEMO_CREDENTIALS.md` ; le demo-login backend est self-healing (re-seed auto au premier appel). `DEMO_PASSWORD` stable via env.
- **Wildcard `*.klasso.tn`** : non activable tant que le DNS reste chez OVH (validation wildcard Vercel + mail OVH) — voir D25. Path-based `/t/<slug>/` reste l'URL tenant effective.

---

## 📞 Informations utilisateur

- **OS local** : Windows 11 (PowerShell) · **Chemin** : `C:\Users\ultra\Desktop\Projets\ecole-saas`
- **Repo GitHub** : `https://github.com/ultra3omda/Jardin` (`gh` CLI authentifié)
- **Vercel** : team `ultra3omda-6664s-projects` — projets `ecole-saas` (web) et `klasso-mobile` (id `prj_rS0q3PqBBh90fJYTdMvxsv6rmOwM`)
- **Railway** : projet `ecole-saasapi-production` → `api.klasso.tn`
- **Expo/EAS** : owner `ultra3omda`, project id `c9e16698-8fa5-4369-b445-3ebb2c1fe111`
- **Domaine** : `klasso.tn` (OVH) · **Email démo** : `ultra3omda@gmail.com` · support : `support@klasso.tn`
- **Préférence** : code complet généré, pas d'apprentissage step-by-step · **Communication en français**, code en anglais

---

## ⚠️ Choses à NE JAMAIS faire

- ❌ Commiter des secrets (`.env`, tokens, clés API)
- ❌ Désactiver TypeScript strict ou une règle ESLint sans justification écrite
- ❌ `push --force` sur `main` / réécrire l'historique public
- ❌ Contourner l'isolation multi-tenant (même « temporairement »)
- ❌ Livrer une vague sans tests (dont test d'isolation pour toute nouvelle table tenant-scoped)
- ❌ Commencer une vague sans validation explicite de l'utilisateur
- ❌ Ajouter une dépendance pour un besoin codable en 20 lignes
- ❌ Breaking change dans `@ecole-saas/shared` sans mettre à jour tous les consumers
- ❌ Refacto opportuniste hors scope de la vague en cours
- ❌ Supposer le contexte — demander si doute

---

## ✅ Comment démarrer chaque session Claude Code

1. Lire ce `CLAUDE.md` (auto)
2. `git status` + `git log --oneline -10` + `gh pr list` pour l'état réel (la roadmap peut être en retard sur les PRs)
3. Demander : *« Voici où en est le projet (résumé). On continue le travail en cours ou on attaque autre chose ? »*
4. Attendre la confirmation avant d'agir
