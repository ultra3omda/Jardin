# Spec — Landing page klasso.tn bilingue FR/AR (V0 commercial)

**Date** : 2026-05-25
**Statut** : Brouillon validé brainstorming, en attente review user
**Auteur** : équipe Klasso
**Branche d'implémentation** : `feat/landing-bilingue`

## 1. Contexte

V1.8 a livré le provisioning super-admin. V2 a livré le module Élèves complet (CRUD + bulk + photo). Le domaine `klasso.tn` est désormais opérationnel sur Vercel (apex + www Valid Configuration ; wildcard reporté en V11 pour cause de limitation Vercel sur wildcard via DNS externe).

**Aujourd'hui** : `klasso.tn/` redirige vers `/login`. Aucune surface marketing publique. Impossible de présenter le produit à un directeur d'école sans démo manuelle.

**V0 commercial cible** : une landing page publique FR/AR sur `klasso.tn/` permettant à un visiteur (directeur d'école, propriétaire de jardin d'enfants) de :
1. Comprendre ce que fait Klasso en moins de 30 secondes
2. Voir les modules disponibles et la roadmap
3. Connaître l'ordre de grandeur du prix
4. Demander une démo en moins d'1 minute

## 2. Décisions lockées (sessions précédentes)

| # | Décision | Lock |
|---|---|---|
| 1 | Ordre des vagues : Landing → Mobile stores → V3 Parents | session 2026-05-25 |
| 2 | Style éditorial : **FR + AR bilingue, ton institutionnel** | session 2026-05-25 |
| 3 | Tagline : **« L'école à l'ère numérique — sans complexité »** / **« المدرسة في عصر رقمي — ببساطة »** | session 2026-05-25 |
| 4 | Pricing affiché : **par élève/mois** — Starter 5 TND (≤50 élèves) · Standard 4 TND (≤200) · Pro 3 TND (illimité) | session 2026-05-25 |
| 5 | Email destinataire form : `process.env.DEMO_REQUEST_TO_EMAIL` (valeur initiale `ultra3omda@gmail.com`, future `demo@klasso.tn`) | session 2026-05-25 |
| 6 | Routing i18n : sous-chemins `/fr` et `/ar` (SEO bilingue) | session 2026-05-25 |
| 7 | Anti-spam : **Cloudflare Turnstile invisible** + Throttler NestJS 5/h/IP en backup | session 2026-05-25 |

## 3. Architecture

### 3.1 Couche web (`apps/web/`)

Migration de **tous les segments routés** sous `app/[locale]/` pour activer next-intl avec sous-chemins :

```
apps/web/app/
├── [locale]/
│   ├── layout.tsx                   # next-intl provider + <html dir={rtl?}>
│   ├── page.tsx                     # Landing — compose 7 sections server-first
│   ├── (auth)/                      # Login, register, forgot/reset password — migrés
│   ├── (app)/                       # Pages authentifiées — migrées
│   └── (onboarding)/                # School-code, etc. — migrés
├── api/                             # NON localisé, reste à la racine
│   └── ...
├── i18n.ts                          # next-intl getRequestConfig
└── middleware.ts                    # next-intl middleware + auth middleware coexistants

messages/
├── fr.json                          # étendu avec strings landing
└── ar.json                          # NEW — toutes les strings traduites
```

**Détection locale** :
- Cookie `NEXT_LOCALE` prioritaire
- Sinon `Accept-Language` (FR par défaut, AR si négocié)
- Switcher manuel dans footer

**RTL** : `<html dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>` dans `[locale]/layout.tsx`. Tailwind variants `rtl:` pour layouts inversés. Police arabe : système (Tahoma fallback) ou import léger Google Fonts Noto Sans Arabic.

### 3.2 Composants landing (`apps/web/components/landing/`)

Server components sauf form (client) :

| Component | Type | Responsabilité |
|---|---|---|
| `hero.tsx` | server | Titre + tagline + CTA "Demander une démo" (scroll-to-form) + image fond école |
| `benefits.tsx` | server | Grid 3 cards bénéfices avec icônes Lucide |
| `modules-grid.tsx` | server | 6 modules avec badges status (✅ disponible / ⏳ Q3-Q4 2026) |
| `trust.tsx` | server | RGPD + hébergement EU+TN + support FR/AR + sécurité multi-tenant |
| `pricing.tsx` | server | 3 cartes Starter/Standard/Pro avec tier Standard featured |
| `demo-form.tsx` | client | react-hook-form + zod + Turnstile + onSubmit POST |
| `footer.tsx` | server | Mentions légales + contact + switcher FR↔AR |
| `language-switcher.tsx` | client | Toggle FR/AR avec persistence cookie |

### 3.3 Couche API (`apps/api/src/demo-requests/`)

Nouveau module NestJS dédié :

```
apps/api/src/demo-requests/
├── demo-requests.module.ts          # registre le controller + service
├── demo-requests.controller.ts      # POST /api/public/demo-request (PAS de JWT, throttled)
├── demo-requests.service.ts         # Validation Turnstile + envoi email Resend
├── dto/demo-request.dto.ts          # DTO class-validator
└── demo-requests.service.spec.ts    # Tests unit (Turnstile mock + Resend mock)
```

**Endpoint** : `POST /api/public/demo-request`

- Pas de JWT (public)
- Throttler global s'applique : 5 req/heure/IP (override possible via `@Throttle()`)
- Body validé par class-validator + Zod côté front avant submit
- Étapes service :
  1. Vérifie `turnstileToken` via Cloudflare `siteverify` API (POST `https://challenges.cloudflare.com/turnstile/v0/siteverify` avec `secret` + `response`)
  2. Si invalide → 400 `TURNSTILE_FAILED`
  3. Construit le template email bilingue (locale dans le body)
  4. Resend `send()` vers `DEMO_REQUEST_TO_EMAIL`
  5. AuditLog `demo.requested` (resource = public, userId/tenantId = null)
  6. Retourne `{ success: true, requestId: <cuid> }`

**Pas de schéma Prisma changé en V0**. Justification : volumes faibles attendus, email-based suffit pour le pipeline manuel. Une éventuelle table `DemoRequest` peut être ajoutée en V0.5 si besoin de tracking.

### 3.4 Template email (`apps/api/src/common/email/templates/demo-request.tsx`)

React Email component bilingue (locale prop) avec :
- Header brandé (logo Klasso + couleur primaire)
- Subject : `[Klasso] Nouvelle demande de démo — <nom école>` / `[كلاسو] طلب عرض توضيحي جديد — <nom>`
- Body : récap des champs + lien direct vers la création tenant `/admin/tenants/new` (super-admin uniquement)

## 4. Schéma de données

### 4.1 DTO `DemoRequestDto`

| Champ | Type | Validation | Optionnel |
|---|---|---|---|
| `firstName` | string | `MinLength(1)`, `MaxLength(100)` | non |
| `lastName` | string | `MinLength(1)`, `MaxLength(100)` | non |
| `email` | string | `IsEmail`, `MaxLength(254)` | non |
| `phone` | string | `Matches(/^\+?[\d\s-]{8,20}$/)` | oui |
| `schoolName` | string | `MinLength(2)`, `MaxLength(200)` | non |
| `studentsCount` | enum | `IsIn(['<50', '50-200', '200-500', '500+'])` | non |
| `message` | string | `MaxLength(2000)` | oui |
| `locale` | enum | `IsIn(['fr', 'ar'])` | non (défaut `'fr'`) |
| `turnstileToken` | string | `MinLength(10)` | non |

### 4.2 Réponse API

```json
{
  "success": true,
  "requestId": "dr_clxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

ou en cas d'erreur :

```json
{
  "code": "TURNSTILE_FAILED",
  "message": "Verification anti-spam échouée. Réessayez.",
  "statusCode": 400
}
```

## 5. Sections détaillées de la landing

### 5.1 Hero

- Background : photo école TN (free stock Unsplash, ou illustration Storyset commerciale-friendly)
- H1 (FR) : "L'école à l'ère numérique — sans complexité"
- H1 (AR) : "المدرسة في عصر رقمي — ببساطة"
- Sous-titre (FR) : "La plateforme SaaS qui gère élèves, parents, enseignants et finances de votre établissement, en un seul endroit."
- Sous-titre (AR) : "منصة SaaS لإدارة الطلاب وأولياء الأمور والمعلمين والمالية في مكان واحد."
- CTA primaire : "Demander une démo gratuite" / "اطلب عرضًا توضيحيًا مجانيًا" (scroll to form)
- CTA secondaire : "Se connecter" / "تسجيل الدخول" (lien `/login`)

### 5.2 Bénéfices (3 cards)

| Bénéfice FR | Bénéfice AR | Icône Lucide |
|---|---|---|
| Gestion élèves complète | إدارة شاملة للطلاب | Users |
| Communication parents transparente | تواصل شفاف مع الأولياء | MessageCircle |
| Suivi pédagogique simplifié | متابعة تربوية مبسطة | BookOpen |

Chaque card : icône + titre + 2-3 lignes de description.

### 5.3 Modules disponibles (grid 6)

| Module | Statut | Badge couleur |
|---|---|---|
| Élèves | ✅ Disponible | vert |
| Parents | ⏳ Été 2026 | ambre |
| Enseignants | ⏳ Été 2026 | ambre |
| Facturation | ⏳ Automne 2026 | ambre |
| Cantine & Transport | 📅 2027 | gris |
| Santé & Bien-être | 📅 2027 | gris |

### 5.4 Confiance (Trust signals)

- **RGPD-ready** : isolation multi-tenant testée, audit logs, export/suppression données utilisateurs
- **Hébergement sécurisé** : serveurs EU (Neon, Vercel) + CDN local
- **Support bilingue** : équipe FR/AR, réponse < 24h
- **Mises à jour continues** : nouvelles features mensuelles sans effort côté école

### 5.5 Pricing

3 cartes côte-à-côte (sur desktop), stack sur mobile :

| Tier | Prix/élève/mois | Limite élèves | Features clés |
|---|---|---|---|
| **Starter** | 5 TND | ≤ 50 | CRUD élèves, communication basique, support email |
| **Standard** ⭐ Le plus populaire | 4 TND | ≤ 200 | Tout Starter + bulk import + photos + multi-rôles + support prioritaire |
| **Pro** | 3 TND | Illimité | Tout Standard + onboarding personnalisé + SLA 99.9% + API access |

Note bas de section : "Tarifs HT. Engagement annuel. Période d'essai de 30 jours sans carte bancaire."

### 5.6 Form démo

8 champs (voir DTO §4.1) + bouton "Envoyer" / "إرسال" + Turnstile widget invisible.

États visuels :
- Idle : form normal
- Submitting : bouton désactivé + spinner
- Success : message vert "Demande reçue, nous vous répondrons sous 24h" + reset form
- Error : message rouge selon code (TURNSTILE_FAILED, THROTTLE_LIMIT, NETWORK_ERROR)

### 5.7 Footer

- Colonne 1 : Logo Klasso + tagline courte
- Colonne 2 : Liens — Tarifs, Modules, FAQ (placeholder V1), Contact
- Colonne 3 : Légal — Mentions légales (page `/[locale]/mentions-legales` minimale V0), Politique RGPD
- Colonne 4 : Switcher langue FR / العربية
- Copyright : © 2026 Klasso — Tous droits réservés

## 6. Plan d'exécution — 4 phases bite-sized (~1.7j total)

### P1 — i18n foundation + routing migration (~0.5j)

- Créer `apps/web/i18n.ts` (next-intl config avec locales `['fr', 'ar']`, defaultLocale `'fr'`)
- Créer `apps/web/messages/ar.json` (vide initialement, à remplir P2)
- Modifier `apps/web/middleware.ts` pour coexistence next-intl middleware + auth middleware
- Migrer `app/(app)/*`, `app/(auth)/*`, `app/(onboarding)/*` sous `app/[locale]/*`
- Mettre à jour tous les `<Link href="/...">` via `next-intl/link` (le composant Link prend la locale en compte automatiquement)
- Smoke test : login complet sur `/fr/login` puis `/ar/login`
- Commit : `feat(web/i18n): activate next-intl with /fr /ar subpaths`

### P2 — Landing sections statiques (~0.5j)

- Créer 7 composants dans `components/landing/`
- Créer `app/[locale]/page.tsx` qui les compose
- Étendre `messages/fr.json` avec toutes les strings landing
- Remplir `messages/ar.json` avec traductions arabes complètes
- Tester responsive mobile-first (≤375px, ≥768px, ≥1024px)
- Tester RTL : layout inversé propre sur `/ar`
- Commit : `feat(web/landing): 7 sections statiques FR/AR (server components)`

### P3 — Form démo + endpoint API (~0.4j)

- Créer `DemoRequestModule` (controller + service + DTO + spec)
- Créer template email `demo-request.tsx`
- Implémenter `demo-form.tsx` (RHF + zod + Turnstile widget + submit)
- Wirer `/api/public/demo-request` côté Next (passthrough proxy ou direct API URL)
- Tests : 5 unit (success FR, success AR, Turnstile fail, validation fail, throttle limit) + 1 e2e
- Commit : `feat(landing): demo request form + API endpoint + bilingual email template`

### P4 — Polish + audit + ADR + PR ready (~0.3j)

- Optimiser image hero via `next/image` (LCP < 2.5s sur mobile 3G)
- Audit Lighthouse mobile (cible ≥ 90 sur Performance / Accessibility / SEO / Best Practices)
- Screen reader test FR + AR (NVDA ou VoiceOver)
- Vérifier focus visible, contraste ≥ 4.5:1, labels ARIA partout
- Écrire ADR 0007 `0007-public-landing-bilingue.md`
- Mettre à jour `docs/roadmap.md` : V1.7-B partiel + entry Landing + D25 lock
- Ouvrir PR draft sur GitHub
- Commit : `docs: ADR 0007 + roadmap landing entry + D25 lock`

## 7. Files créés / modifiés

### Nouveaux fichiers

- `apps/web/i18n.ts`
- `apps/web/messages/ar.json`
- `apps/web/app/[locale]/layout.tsx`
- `apps/web/app/[locale]/page.tsx`
- `apps/web/app/[locale]/(auth)/...` (migration)
- `apps/web/app/[locale]/(app)/...` (migration)
- `apps/web/app/[locale]/(onboarding)/...` (migration)
- `apps/web/components/landing/{hero,benefits,modules-grid,trust,pricing,demo-form,footer,language-switcher}.tsx`
- `apps/web/lib/validation/demo-request.schemas.ts`
- `apps/api/src/demo-requests/demo-requests.module.ts`
- `apps/api/src/demo-requests/demo-requests.controller.ts`
- `apps/api/src/demo-requests/demo-requests.service.ts`
- `apps/api/src/demo-requests/demo-requests.service.spec.ts`
- `apps/api/src/demo-requests/dto/demo-request.dto.ts`
- `apps/api/src/common/email/templates/demo-request.tsx`
- `apps/api/test/demo-requests.e2e-spec.ts`
- `docs/adr/0007-public-landing-bilingue.md`

### Fichiers modifiés

- `apps/web/middleware.ts` (intégration next-intl)
- `apps/web/messages/fr.json` (extension strings landing)
- `apps/api/src/app.module.ts` (import `DemoRequestsModule`)
- `apps/api/src/common/config/configuration.ts` (env `DEMO_REQUEST_TO_EMAIL`, `TURNSTILE_SECRET_KEY`)
- `apps/api/src/common/config/env.validation.ts` (validation des nouvelles env vars)
- `docs/roadmap.md` (landing entry + D25 lock + V1.7-B partiel statut)

## 8. Variables d'environnement nouvelles

### Web (`apps/web/`)

| Variable | Where | Valeur prod |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel env (Production + Preview) | clé publique Turnstile |
| `NEXT_PUBLIC_API_URL` | déjà existant | inchangé |
| `NEXT_PUBLIC_APP_URL` | déjà existant, value `https://klasso.tn` | inchangé |

### API (`apps/api/`)

| Variable | Where | Valeur prod |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Railway env | clé secrète Turnstile (verify endpoint) |
| `DEMO_REQUEST_TO_EMAIL` | Railway env | `ultra3omda@gmail.com` initialement, puis `demo@klasso.tn` après Google Workspace |

## 9. Hors-scope explicite V0 landing

- ❌ Blog / articles SEO (V2.1+)
- ❌ Témoignages clients (zéro client en prod, ne pas inventer)
- ❌ Vidéo démo intégrée (V2.1+)
- ❌ Live chat (V11+)
- ❌ Pricing comparison table détaillée — 3 cartes suffisent V0
- ❌ Sélecteur thème dark/light (V2.1+)
- ❌ Sticky social proof banner (V2.1+)
- ❌ Page FAQ remplie — placeholder V0
- ❌ Page mentions légales complète — minimale V0 (texte boilerplate)
- ❌ Tracking analytics avancé (PostHog en V11 per roadmap)

## 10. Critères d'acceptation

- [ ] `klasso.tn/` redirige vers `/fr` par défaut (ou `/ar` si Accept-Language arabe)
- [ ] `klasso.tn/fr` charge la landing complète en français
- [ ] `klasso.tn/ar` charge la landing complète en arabe avec layout RTL
- [ ] Switcher FR↔AR fonctionne et persiste via cookie `NEXT_LOCALE`
- [ ] Toutes les pages existantes (`/login`, `/dashboard`, `/admin/tenants`, `/students`, etc.) accessibles via `/fr/...` et `/ar/...`
- [ ] Form démo POST `/api/public/demo-request` → email reçu sur `DEMO_REQUEST_TO_EMAIL`
- [ ] Turnstile invisible activé (impossible de submit sans token valide)
- [ ] Throttler bloque > 5 req/heure/IP
- [ ] Lighthouse mobile ≥ 90 sur 4 métriques (Performance, Accessibility, SEO, Best Practices)
- [ ] LCP < 2.5s sur 3G simulé
- [ ] WCAG 2.1 AA validé (contraste, focus, ARIA, navigation clavier)
- [ ] Tests : 5 unit demo-requests + 1 e2e + smoke test login post-migration i18n
- [ ] CI verte (lint + type-check + build + tests)
- [ ] ADR 0007 + roadmap mis à jour
- [ ] PR ready for review, auto-merge sur CI verte

## 11. Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Migration i18n casse l'auth existante | Moyenne | Élevé | Smoke test login après chaque sous-étape P1, rollback rapide via git |
| Traductions AR de qualité médiocre | Moyenne | Moyen | Demander review native speaker avant PR ready (équipe Klasso ou freelance) |
| Turnstile site key indisponible au moment du dev | Faible | Bloquant P3 | Fallback honeypot field + Throttler seul si site key absente |
| Image hero trop lourde → LCP > 2.5s | Moyenne | Moyen | next/image avec sizes + priority, format WebP/AVIF, lazy autres images |
| Police arabe charge lente | Moyenne | Faible | Self-host font subset Noto Sans Arabic |
| Resend rate limit ou bloqué pour certains domaines | Faible | Moyen | Fallback log structuré + monitoring Sentry alert |

## 12. Références

- Plan d'implémentation : `docs/superpowers/plans/2026-05-25-landing-klasso.md` (à générer après approbation spec)
- ADR : `docs/adr/0007-public-landing-bilingue.md` (à créer en P4)
- Pattern email Resend réutilisé : `apps/api/src/common/email/templates/invite.tsx` (V1.5/V1.6)
- Pattern Throttler : `apps/api/src/app.module.ts` (`ThrottlerModule.forRoot([...])`)
- Roadmap : `docs/roadmap.md` (V1.7-B + landing entry + D25 lock)
- next-intl docs : https://next-intl.dev/docs/getting-started/app-router
- Cloudflare Turnstile : https://developers.cloudflare.com/turnstile/get-started/
