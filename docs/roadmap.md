# 🗺️ Klasso — Roadmap master (post-Vague 1)

> **Statut** : Vague 1 livrée en prod le **2026-05-21** (auth multi-tenant, web Next.js sur Vercel, API NestJS sur Railway, Postgres Neon).
> **Document maintenu par** Claude Code, **validé par** l'utilisateur après chaque mise à jour.
> **Cycle de mise à jour** : à chaque fin de vague, ou quand une décision transverse change.

## 🏷️ Brand identity (locked 2026-05-24)

- **Produit** : **Klasso** — SaaS de gestion scolaire multi-tenant (web + 3 apps mobiles dédiées par persona).
- **Domaine racine** : `klasso.tn` (acheté chez OVH 2026-05-24, livraison en cours validation ATI).
- **Format URL école** : `<slug>.klasso.tn` une fois V1.7-B activé. En attendant, path-based `/t/[slug]/` sur l'URL Vercel actuelle.
- **Tagline candidat** : *« Klasso — toute votre école, dans 1 web + 3 apps. »*
- **Positionnement** : « Le SaaS qui rassemble Direction, Enseignants et Parents — déployable en 24h, sans IT. »
- **Cibles** : FR + MENA (TN prioritaire, choix .tn cohérent).
- Le code et les commits parlent encore de « école-saas » par historique — pas de rebranding code en V1.7 (purement marketing/DNS).

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
| **1.5** | Password reset + email verif + page profil + DB migrations + invite-only register + super_admin login + data export RGPD + cookie consent + Sentry boot + i18n infra | ~2.5j | V1 | ✅ Livrée prod 2026-05-22 |
| **1.6** | **White-label runtime per-tenant** (fondations, sans domaine custom) : `Tenant.brand JSON` + endpoints API admin + bucket R2 logos + injection CSS vars **post-auth** (`(app)/layout.tsx` après `getMe()`) + routes **path-based pré-auth** `/t/[tenantSlug]/{login,register,forgot-password,reset-password,verify-email}` + page settings + emails brandés Resend + type partagé `TenantBrand` (mobile theme consommé V2) + ADR 0003. Décision **D20** révisée PM 2026-05-22 (no-custom-domain). **Zéro action DNS user, 0 €/mois additionnel.** | ~1.5j | V1.5 | ✅ Livrée prod 2026-05-23 |
| **1.7-A** | **Klasso naming + scaffold mobile + middleware subdomain dormant** : achat domaine `klasso.tn` (OVH, ~12€/an, livraison validée ATI), scaffold `apps/mobile` Expo SDK 51 (Expo Router + RNR + NativeWind + Zustand + TanStack + secure-store + i18next) avec flag `EXPO_PUBLIC_PERSONA` prévu (parent/teacher/admin), écrans (onboarding code école, login, dashboard placeholder), brand runtime mobile via `/api/public/tenant-brand/:slug`, middleware Next.js host-resolver écrit mais gated par `ENABLE_SUBDOMAIN_RESOLVER`. Décision **D21** (2026-05-24, voir ci-dessous). | ~1.5j | V1.6 | 📋 Planifiée |
| **1.7-B** | **Activation subdomain Klasso** (5 min ops dès que `klasso.tn` arrive d'OVH) : DNS wildcard `*.klasso.tn → cname.vercel-dns.com` + Vercel domain add + `ENABLE_SUBDOMAIN_RESOLVER=true`. Avant : path-based `/t/[slug]/` reste actif. Après : `<slug>.klasso.tn` + `/t/[slug]/` coexistent. | ~5 min | V1.7-A + livraison OVH | 📋 Planifiée |
| **2** | App Mobile Expo (modules métier) + Module Élèves (CRUD complet web + mobile) — scaffold déjà livré V1.7-A | 3j | V1.7-A | 📋 Planifiée |
| **3** | Module Parents + Relations parent-élève (N-N) + Communication 1:1 (REST + WebSocket Socket.IO) | 2j | V2 | 📋 Planifiée |
| **4** | Module Enseignants + Classes + Affectations + Emploi du temps (calendrier hebdo) | 3j | V2 | 📋 Planifiée |
| **5** | RH (contrats, congés, présence) + Paie (calcul brut→net basique, fiche de paie PDF) | 3j | V4 (les enseignants sont aussi du personnel) | 📋 Planifiée |
| **6** | Pédagogie : Notes, Évaluations, Bulletins (export PDF), Rapports trimestriels | 3j | V4 | 📋 Planifiée |
| **7** | Finance : Facturation parents, paiements en ligne (Stripe + Konnect), relances | 3j | V2 + V3 + Resend (V1.5) | 📋 Planifiée |
| **8** | Stock + Cantine + Transport + Santé (carnet médical) + Sécurité (incidents) | 3j | V2 + V4 | 📋 Planifiée |
| **9** | Notifications multi-canal : push (Expo) + email (Resend) + SMS (Twilio) + WhatsApp Business (option) + queues BullMQ/Upstash | 2j | V3 + V5 + Upstash | 📋 Planifiée |
| **10** | Admin SaaS : super-admin platform, billing tenants (subscription Stripe), analytics plateforme (PostHog) | 2j | V7 | 📋 Planifiée |
| **11** | Hardening : Sentry complet + Better Stack + Postgres RLS + perf audit + audit RGPD + backup strategy + **custom domain par école** (`portail.ecole-xyz.fr` via API Vercel automation + admin cross-tenant + brand audit log + optionnel M2 EAS Build natif per-tenant, voir D20). Subdomain wildcard `*.klasso.tn` désormais en V1.7. | ~3j | tout V1-10 + V1.7 | 📋 Planifiée |
| **12** | Mobile build & soumission stores : EAS Build + screenshots + TestFlight + Google Play Internal Testing | 3j | tout V1-11 | 📋 Planifiée |
| | **Total restant** | **~34-35 jours** (V1.7-A 1.5j ajoutée, V11 −1j gagné, V1.7-B 5min négligeable) | | |

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
| **White-label per-tenant** (couleurs + logo + favicon par école) | **Révisions D20 (2026-05-22 AM puis PM)**. White-label runtime livré dès **V1.6** (fondations ~1.5j AVANT V2) en **deux modes** : (1) **post-auth** via `(app)/layout.tsx` qui charge `getMe()` + injecte CSS vars HSL, (2) **pre-auth path-based** via routes `/t/[tenantSlug]/{login,…}`. **Sans domaine custom** (contrainte user PM) : on reste sur `ecole-saas-xxx.vercel.app`. Wildcard subdomain `*.ecole-saas.com` + custom domain + admin cross-tenant reportés **V11** (quand domaine sera acheté). Économie nette ~2.5j vs option B initiale + zéro action DNS user en V1.6. Voir D20 ci-dessous. | V1.6 + V11 |

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
| D19 | ~~**White-label per-tenant** (couleurs + logo + favicon par école) — repoussé en V11~~ | **SUPERSEDED par D20 le 2026-05-22 PM**. La décision originale (option B, retrofit 3-4j en V11) est révisée après production de la spec détaillée [`docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md`](superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md) qui démontre une économie nette ~3j en faisant les fondations runtime en V1.6 (1.5j) au lieu de tout en V11 (5-6j). | ~~V11~~ |
| D20 | **White-label runtime + premium hybride** (supersedes D19) | **Décision utilisateur 2026-05-22 PM : option 1 — V1.6 avant V2 — sans domaine custom (révision PM même date)**. Découpage en 2 vagues : <br/>**V1.6 (~1.5j, runtime fondations sans DNS)** : (1) `Tenant.brand JSON?` migration additive `{primaryColor, primaryHover, secondaryColor, logoUrl, faviconUrl, emailHeaderColor, customDomain?}` (Zod hex regex + anti-SSRF startsWith R2_PUBLIC_URL), (2) endpoints API `GET /api/public/tenant-brand/:slug` (non-auth, cache CDN 5min — consommé par mobile V2+ et par les routes `/t/[slug]/*` pré-auth), `GET/PATCH/DELETE /api/admin/tenant/branding` (SCHOOL_ADMIN), `POST /api/admin/tenant/branding/upload-url` (presigned R2 PUT), (3) bucket R2 `ecole-saas-tenant-assets` (public via `*.r2.dev` ou direct API en attendant `assets.ecole-saas.com` en V11), (4) **post-auth** : `apps/web/app/(app)/layout.tsx` charge `getMe()` → injecte CSS vars HSL dans `<style>` + logo en nav, (5) **pre-auth path-based (choix (a))** : nouvelles routes `apps/web/app/(auth)/t/[slug]/{login,register,forgot-password,reset-password,verify-email}` Server Components qui chargent le brand par slug et délèguent aux composants V1.5 (tenantSlug pré-rempli), (6) page `/settings/branding` (color pickers + upload logo + preview), (7) refonte 4 templates @react-email pour utiliser `tenant.brand.logoUrl` + `emailHeaderColor`, (8) type partagé `TenantBrand` dans `packages/shared` (consommé V2+ par mobile), (9) ADR `0003-tenant-white-label.md`. <br/>**V11 (~1.5j, subdomain + premium tier)** : (a) wildcard DNS `*.ecole-saas.com → cname.vercel-dns.com` + SSL auto Vercel **(l'utilisateur achètera le domaine à ce moment)** + middleware Next.js résout sous-domaine → header `x-tenant-slug`, (b) custom domain par école via API Vercel (`POST /api/admin/tenant/custom-domain`), (c) brand audit log dédié, (d) SUPER_ADMIN cross-tenant branding panel. <br/>**Optionnel V11+ (2j si business)** : M2 EAS Build dynamique per-tenant (icône + nom store custom, l'école paie son compte Apple Developer 99 USD/an). <br/>**Mobile (V2+)** : strategy M1, 3 apps publiques aux stores, écran « code école » au 1er lancement (`apps/mobile/app/(onboarding)/school-code.tsx`), brand persisté `expo-secure-store`, theme provider expose `colors.primary` à tous les écrans. Le code mobile sera produit en V2 (le shell n'existe pas encore en V1.6). <br/>**Hors scope définitif** : M3 builds RN bare per-tenant, per-school marketing site, per-school email domain DKIM/SPF, typo custom, illustrations custom. | Économie ~2.5j sur durée projet (3j total V1.6+V11 vs 5-6j en bloc V11) + branding dispo dès démos V2+ comme argument commercial + V2-V10 naît déjà branded (zéro retrofit). **V1.6 livrable sans qu'aucune action DNS/registrar ne soit nécessaire** — l'utilisateur n'a aucun blocker bloquant le merge V1.6 sur le plan infra. |
| D22 | **Cloud-first preview locked (V1.7-A2)** | **Décision utilisateur 2026-05-24** : tout composant doit être visible/testable en production via une URL cloud accessible depuis n'importe quel navigateur, sans setup local. <br/>**API** : Railway (Dockerfile multi-stage `apps/api/Dockerfile` + `apps/api/railway.json` + runbook `docs/superpowers/runbooks/v1.7-a2-railway-deploy.md`). Free tier 500h/mo. URL publique `klasso-api-production-XXXX.up.railway.app` après les 3 clics dashboard user. <br/>**Web** : Vercel projet `ecole-saas` (déjà en prod depuis V0). <br/>**Mobile** : Expo Web export (`expo export --platform web`) déployé en static sur Vercel projet `klasso-mobile` (id `prj_rS0q3PqBBh90fJYTdMvxsv6rmOwM`, créé via CLI). Workflow GitHub Actions `.github/workflows/deploy-mobile.yml` auto-deploy sur push to main (paths `apps/mobile/**` ou `packages/shared/**`). Trigger manuel via `gh workflow run deploy-mobile.yml`. <br/>**Pnpm monorepo + Expo Metro** : ajout `.npmrc` `node-linker=hoisted` (requis par Metro bundler en monorepo, voir https://docs.expo.dev/guides/monorepos/#pnpm-workspaces). Non-régression vérifiée pour `apps/web` + `apps/api`. <br/>**Local dev mobile** : 2 paths supportés : (a) Expo Go sur smartphone via QR scan (Wi-Fi LAN), (b) Cloud preview URL Vercel (zero install). Path (a) reste documenté dans `apps/mobile/README.md` pour les modules futurs qui ont besoin de modules natifs. | Toute fonctionnalité livrée doit avoir une URL cloud accessible — pas de demo qui demande au user de tirer le repo et installer les deps. Aligné avec la philosophie « production-grade dès V0 » du CLAUDE.md. |
| D21 | **Klasso naming + V1.7 split (subdomain remonté de V11)** | **Décision utilisateur 2026-05-24** : (1) **naming SaaS = Klasso** (marketing brand), **domaine `klasso.tn`** acheté chez OVH (~12€/an), livraison ATI en cours. (2) Strategy commerciale = chaque école = 1 web + 3 apps mobiles dédiées, dont les sous-domaines doivent être prêts dès l'invitation tenant. (3) Donc on **remonte le wildcard subdomain de V11 vers V1.7** pour aligner code + branding. <br/>**V1.7-A (~1.5j, scaffold mobile + middleware dormant)** : (a) `apps/mobile` Expo SDK 51 + Expo Router + RNR + NativeWind + Zustand + TanStack + secure-store + i18next, (b) flag `EXPO_PUBLIC_PERSONA` (parent/teacher/admin) prévu pour V12 builds dédiés, V1.7-A = 1 binaire dev avec switch persona dev menu, (c) écrans : `(onboarding)/school-code.tsx`, `(auth)/login.tsx`, `(app)/dashboard.tsx` placeholder, brand runtime via `/api/public/tenant-brand/:slug`, (d) middleware Next.js host-resolver écrit mais gated par env `ENABLE_SUBDOMAIN_RESOLVER=false` (path-based reste l'URL effective tant que `klasso.tn` pas livré). <br/>**V1.7-B (~5 min ops, après livraison OVH)** : DNS wildcard `*.klasso.tn → cname.vercel-dns.com` (Cloudflare) + Vercel domain add `klasso.tn` + `*.klasso.tn` + SSL auto + `ENABLE_SUBDOMAIN_RESOLVER=true` Vercel env vars → redeploy auto → `<slug>.klasso.tn` opérationnel. <br/>**V2** dépend désormais de V1.7-A (scaffold mobile prêt) — gain ~1j car V2 se concentre sur modules métier. <br/>**V11** réduit de ~4j à ~3j (gagne le subdomain → V1.7), garde custom domain per-école + cross-tenant admin + premium tier. <br/>**M1 mobile** confirmé (3 apps mobiles vendues par école via builds EXPO_PUBLIC_PERSONA séparés V12 — pas 3 codebases). <br/>**Soumission stores** = V12 (pas V1.7). Pas d'Apple Developer Program nécessaire en V1.7. | Avantages : (a) on aligne le code avec la vision business « 3 apps dédiées par école » dès maintenant, (b) le domaine est acheté **une fois pour toute** (`.tn` cohérent avec marché MENA prioritaire), (c) le code middleware host-resolver est écrit mais désactivé → activation 5 min quand DNS prêt, zéro lock-in temporel, (d) V2 démarre avec un mobile shell déjà prêt → V2 = pure feature module Élèves au lieu de scaffold + features mixés. Coût marginal = 12€/an pour le domaine + ~1.5j scaffold. |

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
  - [`0002-v1.5-recovery-invite.md`](adr/0002-v1.5-recovery-invite.md) — Vague 1.5 (invite-only, anti-enum, R2, Sentry, i18n, full session revocation)
  - `0003-tenant-white-label.md` — Vague 1.6 (à produire après livraison V1.6, voir D20)
- [`docs/superpowers/specs/`](superpowers/specs/) — Specs design par vague
  - [`2026-05-22-vague-1.5-recovery-invite-design.md`](superpowers/specs/2026-05-22-vague-1.5-recovery-invite-design.md)
  - [`2026-05-22-tenant-white-label-app-provisioning.md`](superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md) — V1.6 white-label (D20)

---

## 🔄 Historique de cette roadmap

| Date | Auteur | Changement |
|---|---|---|
| 2026-05-22 | Claude Code + ultra3omda | Création initiale après livraison Vague 1 en prod |
| 2026-05-22 | Claude Code + ultra3omda | Q3=C (custom domain repoussé V11), Q4=B (invite-only). V1.5 scope étendu (invite tokens + super_admin login + data export). 18 décisions techniques additionnelles lockées (D1-D18). |
| 2026-05-22 | Claude Code + ultra3omda | V1.5 livrée et mergée sur main (PR #4 `5f2f1421`, PR #5 `7133324`). Politique auto-merge sur CI verte lockée dans CLAUDE.md. |
| 2026-05-22 | Claude Code + ultra3omda | **D19 white-label per-tenant** lockée — option B (repoussé en V11). V11 effort 2j → 5-6j (retrofit 3-4j accepté). Indigo unique en V1.5 → V10. |
| 2026-05-22 PM | Claude Code + ultra3omda | **D20 supersedes D19** après production de la spec [tenant-white-label-app-provisioning](superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md). White-label devient V1.6 (1.5j runtime fondations, AVANT V2) + V11 (1j premium custom domain). V1.5 marquée livrée. Total restant 34-35j → 33-34j. |
| 2026-05-22 PM tard | Claude Code + ultra3omda | **D20 amendée (no-custom-domain)** : contrainte user → pas de domaine custom V1.6. Wildcard `*.ecole-saas.com` + middleware host-resolver + DNS Cloudflare repoussés en V11 (avec le custom domain). V1.6 utilise `(app)/layout.tsx` post-auth + nouvelles routes `/t/[slug]/*` pré-auth (choix (a) path-based). Effort V1.6 inchangé ~1.5j. V11 passe de 1j à 1.5j (gagne le subdomain). V11 row passée de ~3j à ~4j. Zéro action DNS user requis pour livrer V1.6. |
| 2026-05-23 | Claude Code + ultra3omda | **V1.6 livrée prod** — PR #9 mergée (`f43b02e4`, 16 commits feature + 6 fixes CI), PR #10 mergée (`73f52973`, Railway auto-migrate via `start:prod`). User a configuré Custom Start Command Railway + R2 bucket `ecole-saas-tenant-assets` + env vars `R2_PUBLIC_URL=https://pub-61c27e352da04bf5832858af697c671e.r2.dev` + `R2_TENANT_ASSETS_BUCKET`. Migration `Tenant.brand JSONB` auto-appliquée au boot Railway. Sanity check : `/api/public/tenant-brand/:slug` répond 200/404 (= colonne `brand` existe). Runbook complet : [`docs/superpowers/runbooks/2026-05-23-v1.6-post-deploy.md`](superpowers/runbooks/2026-05-23-v1.6-post-deploy.md). |
| 2026-05-23 PM | Claude Code + ultra3omda | **4 fixes post-V1.6** : PR #12 (`8f8ab00b`, React.cache partiel), PR #13 (`245448fe`, rollback (app) layout Client Component — fix boucle infinie 985 fonts car V1.5 refresh-rotation incompatible avec Server Components Next 14), PR #14 (`590b7c9e`, web prebuild shared — Vercel build cassé), PR #15 (`a6f73e8e`, fix `setHydrated(true)` on mount — fix spinner dashboard perpétuel). V1.6 enfin stable end-to-end. |
| 2026-05-24 | Claude Code + ultra3omda | **D21 Klasso naming + V1.7 split** : naming SaaS finalisé = **Klasso**, domaine `klasso.tn` acheté chez OVH (livraison validée ATI en cours). Roadmap V11 wildcard subdomain remonté en **V1.7** (split en V1.7-A code 1.5j + V1.7-B activation 5min ops dès livraison OVH). V2 dépend désormais de V1.7-A (scaffold mobile inclus). V11 reste pour custom domain per-école (`portail.ecole-xyz.fr`) + cross-tenant admin + premium tier. Effort V11 −1j, V1.7-A +1.5j → total ~34-35j. |
