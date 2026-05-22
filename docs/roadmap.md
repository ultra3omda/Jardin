# 🗺️ École SaaS — Roadmap master (post-Vague 1)

> **Statut** : Vague 1 livrée en prod le **2026-05-21** (auth multi-tenant, web Next.js sur Vercel, API NestJS sur Railway, Postgres Neon).
> **Document maintenu par** Claude Code, **validé par** l'utilisateur après chaque mise à jour.
> **Cycle de mise à jour** : à chaque fin de vague, ou quand une décision transverse change.

---

## 🎯 Stratégie globale

- **Ordre des vagues** : fidèle à CLAUDE.md (1.5 → 2 → 3 → ... → 12). Choix validé "B" par l'utilisateur le 2026-05-22.
- **Scope mobile** : iOS + Android dès Vague 12 (validé "B"). Code Expo cross-platform identique entre Vagues 2-11 ; uniquement le pipeline de build/stores différencie.
- **Marché cible** : FR + MENA (TN prioritaire). Modèle B2B subscription par établissement.
- **Mode de planification** : chaque vague a sa propre spec (`docs/superpowers/specs/`) et son propre plan (`docs/superpowers/plans/`). Validation utilisateur entre chaque vague.

---

## 📋 Vagues — vue d'ensemble

| Vague | Scope court | Effort estimé | Dépendances | Statut |
|---|---|---|---|---|
| **0** | Monorepo Turborepo + Next.js Hello World + CI/CD Vercel | 1j | — | ✅ Livrée |
| **1** | Auth multi-tenant + Backend NestJS + Postgres + Web login/register/dashboard | 3j | V0 | ✅ Livrée prod 2026-05-21 |
| **1.5** | Password reset + email verif + page profil + DB migrations + invite-only register + super_admin login + data export RGPD + cookie consent + Sentry boot + i18n infra | ~2.5j | V1 | 📋 Planifiée |
| **2** | App Mobile Expo (shell + login + dashboard) + Module Élèves (CRUD complet web + mobile) | 3j | V1.5 | 📋 Planifiée |
| **3** | Module Parents + Relations parent-élève (N-N) + Communication 1:1 (REST + WebSocket Socket.IO) | 2j | V2 | 📋 Planifiée |
| **4** | Module Enseignants + Classes + Affectations + Emploi du temps (calendrier hebdo) | 3j | V2 | 📋 Planifiée |
| **5** | RH (contrats, congés, présence) + Paie (calcul brut→net basique, fiche de paie PDF) | 3j | V4 (les enseignants sont aussi du personnel) | 📋 Planifiée |
| **6** | Pédagogie : Notes, Évaluations, Bulletins (export PDF), Rapports trimestriels | 3j | V4 | 📋 Planifiée |
| **7** | Finance : Facturation parents, paiements en ligne (Stripe + Konnect), relances | 3j | V2 + V3 + Resend (V1.5) | 📋 Planifiée |
| **8** | Stock + Cantine + Transport + Santé (carnet médical) + Sécurité (incidents) | 3j | V2 + V4 | 📋 Planifiée |
| **9** | Notifications multi-canal : push (Expo) + email (Resend) + SMS (Twilio) + WhatsApp Business (option) + queues BullMQ/Upstash | 2j | V3 + V5 + Upstash | 📋 Planifiée |
| **10** | Admin SaaS : super-admin platform, billing tenants (subscription Stripe), analytics plateforme (PostHog) | 2j | V7 | 📋 Planifiée |
| **11** | Hardening : Sentry complet + Better Stack + Postgres RLS + perf audit + audit RGPD + backup strategy | 2j | tout V1-10 | 📋 Planifiée |
| **12** | Mobile build & soumission stores : EAS Build + screenshots + TestFlight + Google Play Internal Testing | 3j | tout V1-11 | 📋 Planifiée |
| | **Total restant** | **~31 jours** | | |

---

## 🔒 Décisions transverses lockées

Ces décisions impactent plusieurs vagues. Lockées dans cette roadmap pour éviter les remises en cause par-vague.

### Stack mobile (impact V2-12)

| Décision | Choix | Justification |
|---|---|---|
| Framework | **Expo SDK 51+** | CLAUDE.md locké. Cross-platform iOS+Android, EAS Build inclus. |
| Router | **Expo Router** (file-based) | Pattern Next.js-like, transferable mental model web↔mobile. |
| **UI components** | **React Native Reusables (RNR)** | shadcn/ui pour RN. Design tokens partagés avec web (indigo primary). Cohérence visuelle web↔mobile. |
| Styling | **NativeWind** | CLAUDE.md locké. Tailwind pour RN. Compatible RNR. |
| State | **Zustand** + **TanStack Query** | Idem web V1. Pas de Redux. |
| Forms | **react-hook-form + zod** | Idem web V1. |
| Secure storage | **expo-secure-store** | Refresh token dans Keychain (iOS) / Keystore (Android). AccessToken en mémoire (Zustand). |
| i18n | **i18next + expo-localization** | CLAUDE.md locké. Source de vérité commune = `packages/shared/locales/{fr,en,ar,es}.json`. |
| Tests unit | **Jest** + **@testing-library/react-native** | CLAUDE.md locké. |
| Tests E2E | **Maestro** | CLAUDE.md locké. Cross-platform iOS+Android. Plus simple que Detox. |
| Push notifs | **Expo Notifications** | CLAUDE.md locké. Gère APNs + FCM derrière l'API Expo. |
| Build | **EAS Build** (Expo Application Services) | Free tier suffisant pour V12 (30 builds/mois). |

### Stack backend (impact toutes les vagues)

| Décision | Choix | Justification |
|---|---|---|
| **DB migrations** | Passer de `prisma db push` à **`prisma migrate`** | À fixer en V1.5. Le repo n'a pas de fichier `migrations/`. Bloquant pour tout changement de schéma en V2+. |
| Queues | **BullMQ + Upstash Redis** | CLAUDE.md locké. Free 10K commands/jour Upstash. Activé en V9. |
| WebSocket | **Socket.IO** | CLAUDE.md locké. Activé en V3. |
| File storage | **Cloudflare R2** | CLAUDE.md locké. S3-compatible, zero egress, $0.015/GB stored. Signed URLs PUT depuis le client mobile pour bypass l'API. |
| Email transactional | **Resend** | CLAUDE.md locké. Free 100/jour, $20/mois pour 10K. Activé en V1.5 (password reset). |
| SMS | **Twilio** | CLAUDE.md locké. Pay-as-you-go (~$0.04/SMS). Activé en V9. |
| Paiements | **Stripe + Konnect** (mandatory) | Stripe international, Konnect Tunisie/MENA. Paymee = fallback optionnel si Konnect ne couvre pas un pays cible. Activé en V7. |
| Multi-tenant isolation | **Prisma extension** (V1) **+ Postgres RLS** (V11 hardening) | Defense in depth. Extension actuelle suffit pour V2-10. |

### Stack ops (impact V11 mais activé en avance partiellement)

| Décision | Choix | Activation |
|---|---|---|
| Errors monitoring | **Sentry** | Hook en V1.5 (boot léger), config complète en V11. Free 5K errors + 10K perf/mois. |
| Logs + uptime | **Better Stack** (Logtail + Uptime) | Activé en V11. Free 1 GB logs + 10 monitors. |
| Analytics produit | **PostHog** | Activé en V2 (events utilisateurs commencent là). Free 1M events/mois. |
| Custom domain | **OVH** (déjà détenu par l'utilisateur) | Branchement Vercel + Railway en V1.5. HTTPS auto via Let's Encrypt. |
| Backups Postgres | **Neon snapshots auto** (7j gratuits) + **dump quotidien vers R2** | Activé en V11. |

### Décisions produit (impact UX)

| Décision | Choix | Vague |
|---|---|---|
| **Image upload élèves (photos)** | Signed URLs PUT direct vers R2 depuis le client | V2 |
| **Auth super_admin login** | Activée — RefreshToken.tenantId passé nullable, schema update en V1.5 | V1.5 |
| **Healthcare compliance V8** | **RGPD strict** (encryption Neon native, audit logs sur reads santé, soft-delete + rétention 5 ans, endpoint export user). PAS HIPAA strict (cible FR/MENA écoles primaires). | V8 + V11 |
| **Bulletins PDF** | Génération server-side via **@react-pdf/renderer** dans un BullMQ worker | V6 |
| **Real-time messages V3** | Persistence Postgres + Socket.IO pour les push instantanés. Pas de Redis pubsub avant V9 (YAGNI). | V3 |
| **Mode offline mobile** | **Hors scope V1-11.** TanStack Query cache offline-light suffit. Vrai mode offline (SQLite local sync) = post-V12 si demande utilisateur. | post-V12 |
| **Localisation par défaut** | `fr` partout. Tenants peuvent changer leur `locale` à la création. Sélecteur de langue dans la page profil V1.5. | V1.5 |
| **Custom domain OVH** | **Q3=C** — Repoussé en V11 hardening. On garde `ecole-saas-weld.vercel.app` + `ecole-saasapi-production.up.railway.app` jusque-là. | V11 |
| **Modèle d'inscription** | **Q4=B** — **Invite-only**. Public `/register` désactivé sans `?token=xxx` valide. Super-admin émet les tokens via endpoint dédié. Page landing remplace "Créer un établissement" par "Demander un accès" (mailto pour MVP). | V1.5 |

### Décisions techniques additionnelles (lockées 2026-05-22)

| # | Décision | Choix | Raison |
|---|---|---|---|
| D1 | i18n launch scope | `fr` only en V1.5. EN en V2. AR (RTL) en V8. ES en V10. | YAGNI; ajouter 4 langues d'un coup = 4x effort sans valeur immédiate |
| D2 | Email verification | **Mandatory** avant 1er login | Industry standard B2B SaaS, anti-spam |
| D3 | Cookie consent banner | Ship en V1.5, ~50 lignes inline (pas de lib) | RGPD requis dès qu'on ajoute PostHog V2 |
| D4 | Tenant onboarding wizard | **Pas de wizard** en V1.5, redirect direct `/dashboard`. Wizard en V10. | YAGNI |
| D5 | Per-tenant tier limits / `Plan` entity | **Pas d'entité `Plan` avant V10** — tous les tenants free unlimited. V10 introduit Stripe Subscriptions + tiers. | YAGNI |
| D6 | Mobile biometric unlock (FaceID/TouchID) | V11 hardening, pas V2 | Standard mais pas bloquant |
| D7 | API versioning (`/v1/`, `/v2/`) | Defer — pas de prefix avant V10+ | YAGNI, 0 consommateurs externes |
| D8 | CSP headers prod | V11 hardening | Helmet désactivé en dev, à whitelister Vercel+R2+Resend+PostHog |
| D9 | Audit log retention | **2 ans** | Standard RGPD données scolaires |
| D10 | Neon branching strategy previews | Branche `preview` partagée pour toutes les PRs | Free tier 10 branches max ; 1 par PR = pas scalable |
| D11 | Search élèves V2 | Postgres `tsvector` full-text natif | Indexable, gratuit. Pas besoin Algolia avant 10K+ élèves/tenant |
| D12 | Tenant-per-subdomain (`<tenant>.app.com`) | **NON** — slug en query param/path | Wildcard SSL+DNS = complexité énorme, pas de cas d'usage MVP |
| D13 | Data export RGPD format | **JSON dans ZIP**, email-delivered, link expirant 24h | Lisible machine+humain, simple à implémenter |
| D14 | Migrations schema breaking change | **Backward-compat toujours** + soft-delete au lieu de drop | Évite downtimes |
| D15 | Mobile push token storage | Table `DeviceToken (id, userId, tenantId, platform, token, lastActiveAt)` créée en V2 | Stocké au login mobile, utilisé V9 |
| D16 | Webhook receiver Stripe V7 | Endpoint NestJS `/api/webhooks/stripe` + signature verify | Pas de Vercel Function ; API Railway gère |
| D17 | App icon + splash mobile | Placeholder V2, design pro en V12 (avant store) | Pas bloquant TestFlight interne |
| D18 | Throttling sur `/auth/register` | 5 req/min/IP (déjà via Throttler global) + CAPTCHA en V11 | V1 a déjà le throttler; CAPTCHA post-spam |

---

## ⚠️ Risk register

| # | Risque | Probabilité | Impact | Mitigation | Vague |
|---|---|---|---|---|---|
| R1 | Prisma migrations non générées → impossible de modifier le schéma en prod sans data loss | **Haute** | 🔴 Bloquant | Générer migration init en V1.5. Switch CI vers `prisma migrate deploy`. | V1.5 |
| R2 | Stripe + Konnect intégrations différentes (webhooks, currency) → bugs facturation | Moyenne | 🟠 Élevé | Tests E2E avec sandbox des 2 fournisseurs. Wrapper unifié `PaymentProvider`. | V7 |
| R3 | Apple Developer Account refus / soumission TestFlight rejetée | Moyenne | 🟠 Élevé | Premier build TestFlight dès V2 (pas attendre V12) en interne pour valider le pipeline. | V2-V12 |
| R4 | Données santé V8 → audit RGPD CNIL | Moyenne | 🟠 Élevé | ADR `0002-rgpd-strategy.md` en V8. Endpoint export/delete user en V1.5. | V8 |
| R5 | Tenant peut atteindre la limite Neon free (0.5 GB) → besoin upgrade | Moyenne | 🟢 Moyen | Monitor via PostHog/Sentry quotas. Upgrade Neon Pro à 200+ tenants. | V10 |
| R6 | Push notif iOS — APNs certificate expire après 1 an | Faible | 🟠 Élevé | Documenter renouvellement dans le runbook V11. | V11 |
| R7 | WhatsApp Business API approval (24-48h Meta) | Moyenne | 🟢 Moyen | Démarrer demande Meta dès V8. Fallback SMS si pas approuvé. | V9 |
| R8 | Maestro tests flaky sur Android emulator CI | Moyenne | 🟢 Moyen | Run mobile E2E sur iOS uniquement en CI, Android en EAS Test. | V12 |
| R9 | Bundle size mobile dépasse store limits | Faible | 🟢 Moyen | Audit en V12. Code splitting Expo Router auto. | V12 |
| R10 | Cross-tenant data leak via une nouvelle table manquante dans `TENANT_SCOPED_MODELS` | **Haute** | 🔴 Bloquant | Test isolation E2E doit inclure CHAQUE nouvelle table tenant-scoped à partir de V2. CI fail si nouvelle table sans test. | toutes V2+ |

---

## 🧱 Stack — récapitulatif consolidé

### Frontend Web (`apps/web`)

```
Next.js 14 (App Router, RSC, typedRoutes)
├── TypeScript strict
├── Tailwind CSS + shadcn/ui (indigo primary)
├── react-hook-form + zod
├── Zustand (auth) + TanStack Query (data — V2+)
├── next-intl (i18n — V1.5+)
└── Playwright (E2E)
```

### Mobile (`apps/mobile`) — V2+

```
Expo SDK 51+
├── Expo Router (file-based, comme Next.js App Router)
├── React Native Reusables (shadcn pour RN, NativeWind)
├── NativeWind (Tailwind RN)
├── react-hook-form + zod
├── Zustand (auth) + TanStack Query
├── expo-secure-store (refresh token)
├── Expo Notifications (push)
├── i18next + expo-localization
├── Jest + @testing-library/react-native (unit)
└── Maestro (E2E cross-platform)
```

### Backend API (`apps/api`)

```
NestJS 10
├── Prisma 5 (DB)
│   ├── PostgreSQL 16 (Neon prod, Docker local)
│   └── Migrations: prisma migrate (à partir de V1.5)
├── JWT HS256 + Passport
├── bcrypt rounds 12
├── class-validator (DTOs)
├── Pino logging (PII redaction)
├── Helmet + Throttler (rate limit)
├── Swagger /api/docs
├── Socket.IO (real-time — V3+)
├── BullMQ + Upstash Redis (queues — V9+)
└── Vitest (unit + e2e)
```

### Infra & Services

```
Hosting
├── Vercel (web)         → Hobby tier, gratuit
├── Railway (api)        → Pro tier, $5/mois usage-based
└── Neon (postgres)      → Free tier, 0.5 GB

Services tiers
├── Resend (email)       → Free 100/jour, $20/mois 10K (V1.5+)
├── Cloudflare R2 (files) → Free 10 GB, zero egress (V2+)
├── Upstash (Redis)      → Free 10K cmd/jour (V9+)
├── Twilio (SMS)         → Pay-as-you-go ~$0.04/SMS (V9+)
├── Stripe (payments)    → 1.4% + 0.25€ par tx (V7+)
├── Konnect (payments MENA) → ~2.5% par tx (V7+)
├── Sentry (errors)      → Free 5K (V1.5+)
├── Better Stack (logs)  → Free 1 GB + 10 monitors (V11+)
└── PostHog (analytics)  → Free 1M events/mois (V2+)

CI/CD
└── GitHub Actions       → Free (repo public)
    ├── Job 1: lint-typecheck-build
    ├── Job 2: test-api (postgres service)
    └── Job 3: test-e2e-web (postgres + api + web + playwright)

Coût total estimé en prod
├── MVP (V1-V6)          : ~$5/mois (Railway only)
├── Lancement (V7+)      : ~$30/mois (Railway + Resend + Upstash basic)
└── Scale (200+ tenants) : ~$150-200/mois (Neon Pro + Resend Pro + Sentry Team)
```

---

## 📐 Standards de qualité (rappel CLAUDE.md)

Pour chaque vague :

- ✅ TypeScript strict, ESLint 0 warning
- ✅ Tests unit (Vitest/Jest) + integration + E2E (Playwright/Maestro)
- ✅ Coverage ≥ 70% sur code applicatif
- ✅ Multi-tenant isolation testée pour chaque nouvelle table tenant-scoped (R10)
- ✅ Pas de console.log en prod (Pino côté API, wrapper logger côté web/mobile)
- ✅ Fichiers < 300 lignes, fonctions < 50 lignes
- ✅ Conventional Commits
- ✅ ADR pour chaque décision structurante (`docs/adr/00NN-...md`)
- ✅ Swagger à jour (auto-généré)
- ✅ Validation d'entrée sur TOUS les endpoints (class-validator API, zod web)
- ✅ WCAG 2.1 AA web
- ✅ RGPD : export/delete par tenant (V1.5+)

---

## 🚀 Workflow par vague

Inspiré du CLAUDE.md + les skills Superpowers :

```
Pour chaque vague N :
1. (Si pas déjà fait) Spec    → docs/superpowers/specs/YYYY-MM-DD-vague-N-<nom>-design.md
2. Validation utilisateur de la spec
3. Plan détaillé              → docs/superpowers/plans/YYYY-MM-DD-vague-N-<nom>.md
4. Validation utilisateur du plan
5. Execution                  → via skill executing-plans (commits atomiques)
6. Checkpoints                → s'arrêter avant: prisma migrate, ajout de dep majeure, modif workflows CI, push --force
7. Récap final                → mise à jour roadmap.md (statut vague + retours d'expérience)
8. Mise à jour CLAUDE.md      → si pattern récurrent / gotcha à mémoriser
9. Commit + PR + merge        → après CI verte
```

---

## 📚 Documents liés

- [`CLAUDE.md`](../CLAUDE.md) — Contexte projet + standards qualité (source de vérité)
- [`docs/architecture.md`](architecture.md) — Diagramme actuel (à mettre à jour à chaque vague)
- [`docs/adr/`](adr/) — Architecture Decision Records
  - [`0001-auth-strategy.md`](adr/0001-auth-strategy.md) — Vague 1 (HS256, refresh rotation, bcrypt 12)

---

## 🔄 Historique de cette roadmap

| Date | Auteur | Changement |
|---|---|---|
| 2026-05-22 | Claude Code + ultra3omda | Création initiale après livraison Vague 1 en prod |
| 2026-05-22 | Claude Code + ultra3omda | Q3=C (custom domain repoussé V11), Q4=B (invite-only). V1.5 scope étendu (invite tokens + super_admin login + data export). 18 décisions techniques additionnelles lockées (D1-D18). |
