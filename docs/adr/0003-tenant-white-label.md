# ADR 0003 — Tenant White-Label Runtime (V1.6)

**Date** : 2026-05-23
**Statut** : Accepté (supersedes D19, implements D20 révisé PM)
**Décideurs** : ultra3omda + Claude Code
**Source spec** : [`docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md`](../superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md)
**Source plan** : [`docs/superpowers/plans/2026-05-22-v1.6-white-label-runtime.md`](../superpowers/plans/2026-05-22-v1.6-white-label-runtime.md)

---

## Contexte

Chaque école/maternelle activée sur École SaaS doit avoir « son » application avec couleurs + logo identifiables.

La décision initiale **D19** (2026-05-22 AM) reportait tout en V11 hardening (5-6 j). Après production de la spec, **D20** (2026-05-22 PM) a découpé V1.6 (1.5 j) + V11 (1.5 j) = 2.5 j total → économie ~3 j + branding dispo dès démos V2+.

Une révision PM tardive 2026-05-22 a ajouté la contrainte **« no-custom-domain en V1.6 »** : on reste sur Vercel free (`ecole-saas-xxx.vercel.app`), pas d'achat de domaine. Le wildcard `*.ecole-saas.com` + middleware host-resolver passent à V11.

## Décision

**Option A (runtime white-label) sans subdomain** :

### Backend (Phase A + B)

1. `Tenant.brand JSONB?` — migration additive zero-downtime (V1.5 tenants restent sur DEFAULT_BRAND indigo via NULL).
2. `packages/shared` exporte `TenantBrand`, `DEFAULT_BRAND`, `hexToHslTriplet`, `isHexColor`, `RESERVED_TENANT_SLUGS`.
3. Endpoints API (NestJS) :
   - `GET /api/public/tenant-brand/:slug` — non-auth, Cache-Control 5min, consommé par pre-auth web + mobile V2.
   - `GET /api/admin/tenant/branding` — lit le brand du tenant courant (SCHOOL_ADMIN | SUPER_ADMIN).
   - `PATCH /api/admin/tenant/branding` — partial update DTO-validated.
   - `DELETE /api/admin/tenant/branding` — reset à DEFAULT_BRAND.
   - `POST /api/admin/tenant/branding/upload-url` — presigned R2 PUT URL.
4. Bucket R2 `ecole-saas-tenant-assets` séparé du bucket exports. URL publique exposée via env `R2_PUBLIC_URL`.
5. **Anti-SSRF** : `logoUrl`/`faviconUrl` doivent commencer par `R2_PUBLIC_URL`. Validation server-side dans `TenantBrandService.update`.
6. **Anti-XSS sur couleurs** : custom `@IsHexColor()` decorator (regex `/^#[0-9a-f]{6}$/i`) côté API + Zod regex côté web. `hexToHslTriplet` output est un triplet numérique pur — injection `<style>` safe.
7. **Email templates V1.5 refactorisés** : `EmailLayout` accepte `brand?` + `tenantName?`, header utilise `brand.emailHeaderColor` + logo. `ctaButtonStyle` passe de const → fonction `(brand) => style`. Services threading (`EmailVerificationService`, `PasswordRecoveryService`, `ExportService`) fetch tenant + brand, génèrent URLs pré-auth path-based.
8. **Endpoints `/auth/me` + `/auth/login` + `/auth/refresh` + `/users/me`** : `TenantDto` gagne champ `brand` (pass-through JSONB partial).

### Frontend (Phase C + D)

1. **Post-auth** : `apps/web/app/(app)/layout.tsx` est un Server Component qui :
   - Charge `getMeFromCookies()` (refresh+me server-side) → redirect `/login` si null.
   - Résout `brand` mergé sur DEFAULT_BRAND.
   - Inject `<style>` avec CSS vars HSL shadcn-compatible (FIRST paint déjà thématisé).
   - Set `<link rel=icon>` si `brand.faviconUrl` présent.
   - Délègue le rendu interactif à `AppShellClient` (Client Component) avec `initialSession` pré-hydratée → pas de flash spinner sur nav.
2. **Pre-auth path-based** : nouvelles routes `(auth)/t/[slug]/{login,register,forgot-password,reset-password,verify-email}`. Layout `(auth)/t/[slug]/layout.tsx` :
   - Server Component, fetch brand par slug via `getTenantBrand`.
   - `notFound()` si slug inconnu → page 404 brandée custom.
   - Inject CSS vars + favicon + `generateMetadata` (titre = nom tenant).
3. `/login` sans slug reste fallback générique indigo — le form garde le champ `tenantSlug` manuel V1.5.
4. **Helpers** : `lib/tenant/{brand-style-tag,brand,hex-to-hsl}.ts` + `lib/api/server-client.ts` (`getMeFromCookies`).
5. **Settings UI** : `/settings/branding` (SCHOOL_ADMIN | SUPER_ADMIN) avec :
   - `ColorInput` (hex + native swatch, a11y).
   - `LogoUploader` (direct-to-R2 PUT via presigned URL, 500KB max, MIME allowlist).
   - `BrandingForm` (4 color pickers, 2 uploaders, preview button, reset, save).

### Mobile

Préparation du contrat partagé `TenantBrand` dans `packages/shared`. Le shell mobile n'existe pas encore (créé en V2). Strategy M1 (1 binaire multi-tenant + écran « code école ») retenue dans la spec ; implémentation déférée à V2+.

## Alternatives rejetées

- **D19 option B (tout en V11 — 5-6 j en bloc)** : superseded par D20. Économie 3 j en livrant V1.6 maintenant + branding dispo pour démos V2+.
- **Subdomain `*.ecole-saas.com` en V1.6** : superseded par contrainte user « no-custom-domain » (PM tardive). Reporté V11 (avec custom domain).
- **Pre-auth différé (générique indigo jusqu'à login)** : rejeté au profit du choix (a) path-based. Coût marginal ~0.5j, UX cohérente dès V1.6.
- **Option B (N déploiements Vercel + N builds Expo)** : ingérable au-delà de 5 écoles, Apple Store impossible à scaler.

## Conséquences

**Positives** :
- Onboarding nouvelle école < 5 min (création tenant + 4 couleurs + 1 logo dans /settings/branding).
- **Coût infra V1.6 additionnel : 0 €/mois** (R2 free tier, Vercel Hobby). Bucket `ecole-saas-tenant-assets` reste sous les 10 GB R2 free pour ~18k logos.
- **Aucune action manuelle DNS/registrar requise pour livrer V1.6** — user n'a aucun blocker infra.
- V2-V10 naissent déjà branded — zéro retrofit en V11.
- Économie ~3 j sur la durée projet (vs D19 original).
- URL `/t/<slug>/login` partageable par les écoles (parents bookmark).

**Négatives** :
- Le sous-domaine `*.ecole-saas.com` reste invisible en V1.6 (URL Vercel + path-based). Premium V11 résout via wildcard DNS + custom domain.
- L'icône d'app mobile reste générique en V1.6-V11 (3 apps publiques). Premium V11 (M2 EAS Build dynamique) résout pour tier payant.
- 2 chemins URL pour l'auth pré-V11 (`/login` générique + `/t/<slug>/login` brandé) — UX deux-tracks à expliquer. Sera unifié par subdomain en V11.

## Sécurité

| Vecteur | Mitigation |
|---|---|
| XSS via couleurs `<style>` injection | Regex stricte `/^#[0-9a-f]{6}$/i` côté API DTO ET Zod web. `hexToHslTriplet` output = numeric triplet (pas de `<>'"`). |
| SSRF via logoUrl prefetch | `TenantBrandService.update` rejette si `!value.startsWith(R2_PUBLIC_URL)` → `BRAND_URL_NOT_IN_R2`. |
| Cache CDN obsolète post-PATCH | Tag `tenant-brand:<slug>` dans Next.js fetch revalidate. API peut déclencher `revalidateTag` en V11+ via webhook. |
| Multi-tenant leak | Prisma extension TENANT_SCOPED_MODELS + JWT `tenantId` extraction. Cross-tenant SUPER_ADMIN rejeté avec `TENANT_CONTEXT_REQUIRED` (V11 admin panel). E2E test couvre l'isolation. |
| Browser CORS sur PUT direct R2 | Configuré côté Cloudflare R2 bucket (allowlist `https://ecole-saas-*.vercel.app` + localhost). |
| Upload abuse (gros fichiers) | MIME allowlist client + serveur, max 500KB côté client. Server-side max via R2 bucket settings. |

## Migration

Migration `20260523000000_v1_6_tenant_brand` : `ALTER TABLE "tenants" ADD COLUMN "brand" JSONB;`. Tous les tenants existants restent sur DEFAULT_BRAND automatiquement (`brand` NULL → service merge sur DEFAULT_BRAND à la lecture).

**À appliquer en prod Neon via** `pnpm --filter=api prisma migrate deploy` après merge V1.6 (checkpoint user confirmation).

## Liens

- Spec : [`docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md`](../superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md)
- Plan : [`docs/superpowers/plans/2026-05-22-v1.6-white-label-runtime.md`](../superpowers/plans/2026-05-22-v1.6-white-label-runtime.md)
- DNS actions V11 (réserve) : [`docs/superpowers/plans/2026-05-22-v11-dns-domain-actions.md`](../superpowers/plans/2026-05-22-v11-dns-domain-actions.md)
- Roadmap D20 : [`docs/roadmap.md`](../roadmap.md)
- ADR 0001 — Auth strategy V1
- ADR 0002 — V1.5 recovery + invite
