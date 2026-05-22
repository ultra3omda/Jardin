# Tenant White-Label — Provisioning de l'app web + mobile par école (design spec)

> **Statut** : Draft pour validation utilisateur. **Aucun code produit tant que l'approche n'est pas validée.**
> **Date** : 2026-05-22
> **Auteur** : Claude Code
> **Contexte** : Reprise de la décision D19 (roadmap), initialement reportée à V11 (option B). Le user veut revoir l'approche technique avant de figer le timing (V1.6 vs V11 vs autre).
> **Prérequis** : V1.5 livrée en prod (auth multi-tenant, recovery, invite-only, RGPD export, Sentry, i18n FR).
> **Effort estimé** :
> - **Option A "runtime" (recommandée)** : ~1.5 j en V1.6 (fondations) + ~1 j en V11 (custom domain). Total ~2.5 j.
> - Option B "N déploiements" : 5-8 j initial + coût ops perpétuel. **Rejetée** (voir §1.3).
> - Option C "hybride" : V1.6 (Option A) + V11 (Option C premium tier). Total ~2.5 j, identique à A en coût initial.

---

## 🎯 Question à laquelle ce doc répond

> *« Quand on active École SaaS pour une école/maternelle, comment cette école obtient-elle « son » application web ET mobile avec ses couleurs, son logo, et idéalement son nom de domaine ? »*

Trois choix possibles et un seul est viable à l'échelle de 10→500 écoles. La suite est une comparaison structurée.

---

## 1. Modèle d'architecture (trois options + reco)

### 1.1 Option A — White-label **runtime** (une seule app web + une seule app mobile, branding injecté dynamiquement) ⭐ recommandée

**Principe** : on garde **1 binaire web** (Next.js sur Vercel) et **3 binaires mobile** (parent / teacher / admin, sur Expo) pour TOUTES les écoles. Le branding (logo, couleurs, nom de l'école) est **résolu à l'exécution** depuis la base de données via le `Tenant.brand` JSON.

**Comment chaque école est « son app »** :
- **Web** : chaque école a une URL `https://saint-exupery.ecole-saas.com` (sous-domaine). Le middleware Next.js lit `request.headers.host`, en déduit le `tenantSlug`, charge le branding, et l'injecte dans le HTML/CSS avant le rendu. Pour un visiteur, **la page ressemble à une app dédiée**.
- **Mobile** : 3 apps publiques sur les stores (`École SaaS — Parents`, `… — Enseignants`, `… — Direction`). Au premier lancement, l'utilisateur tape son code-école (ou scanne un QR code reçu par email) → l'app charge le branding du tenant et theme tous les écrans. **Une fois loggé, l'app affiche le logo + couleurs de son école**.

**Avantages** :
- 1 build web + 3 builds mobile à maintenir, peu importe le nombre d'écoles (10 ou 500).
- Onboarding d'une nouvelle école : **< 5 min** (création tenant DB + upload logo + saisie des couleurs dans le settings UI). Zéro ops.
- Coût infra : **0 € additionnel par école** (Vercel + R2 partagés).
- Apple/Google review : **3 listings au total à vie** (pas par école).

**Inconvénients** :
- Pas de "vraie" app native indépendante : `saint-exupery.app` n'est PAS dans l'App Store (juste l'app générique). Pour beaucoup d'écoles c'est OK, mais une école très "premium" peut le vouloir → voir V11 / Option C.
- Le sous-domaine `*.ecole-saas.com` reste visible dans la barre URL (ce n'est pas un domaine custom). Solution : custom domain V11.

### 1.2 Option B — White-label **build-time** (N déploiements Vercel + N builds Expo) ❌ rejetée

**Principe** : à chaque création de tenant, on lance un pipeline qui :
1. Crée un nouveau projet Vercel (`saint-exupery-web`) avec ses env vars et son domaine.
2. Lance un build Expo EAS dédié avec un `app.json` custom, soumet aux stores.
3. Provisionne potentiellement une DB Postgres dédiée.

**Pourquoi c'est rejeté** :
- **Coût store Apple** : chaque app soumise = 1 review (1-3 jours, parfois plus en première soumission), 1 listing dans le portail développeur. Compte Apple Developer Program = 99 USD/an et plafonne en pratique vers ~300 apps avant que ça devienne ingérable. Sans parler de l'effort review par école.
- **Coût Vercel** : sur le plan Hobby on est limité à 1 projet. Sur Pro (20 USD/mois) on a des "projets illimités" mais chaque déploiement consomme du build time.
- **Coût ops** : maintenance, secrets, monitoring × N écoles. Ingérable au-delà de 5 écoles.
- **Pas de mise à jour atomique** : pousser un fix à 100 écoles = 100 redeploys + 100 store submissions.

**Verdict** : option de niche, justifiée uniquement pour des partenaires premium "marque blanche complète". Voir Option C pour intégrer ça à la marge.

### 1.3 Option C — Hybride (runtime pour tous + opt-in build dédié pour premium)

**Principe** : option A par défaut pour 100 % des écoles. En V11+, on offre un **tier "premium"** payant qui ajoute :
- Domaine custom (`portail.ecole-saint-exupery.fr` au lieu de `saint-exupery.ecole-saas.com`).
- Optionnel : build mobile dédié soumis aux stores sous le nom de l'école (Apple/Google).

C'est **l'évolution naturelle de A**. On ne s'en occupe pas en V1.6 — juste le runtime suffit pour démontrer la valeur.

### 1.4 Reco synthétique

| Critère | A (runtime) | B (N déploiements) | C (hybride) |
|---|---|---|---|
| Effort initial | ~1.5 j | ~5-8 j | ~1.5 j (= A) |
| Effort par école | ~0 min | ~30 min + review store | ~0 min (premium = ~1 j manuel) |
| Coût/école/mois | 0 € | 5-15 € (build time, ops) | 0 € (premium : facturé au client) |
| Scalabilité 10→500 écoles | ✅ | ❌ | ✅ |
| Look « app dédiée » | ⚠️ Partiel (sous-domaine + branding) | ✅ Total | ✅ (premium) ou ⚠️ (default) |
| App Store dédiée | ❌ | ✅ | ✅ (premium uniquement) |
| Custom domain (`ecole-xyz.fr`) | ❌ | ✅ | ✅ (premium V11) |

**Reco : Option A en V1.6, Option C en V11 si business le justifie.** On reste pragmatique — 95 % des écoles seront ravies de A.

---

## 2. Web — détails techniques (Option A)

### 2.1 Résolution du tenant depuis l'URL

**Format** : `https://<tenantSlug>.ecole-saas.com` (sous-domaine).
- `saint-exupery.ecole-saas.com` → tenant `saint-exupery`
- `marie-curie.ecole-saas.com` → tenant `marie-curie`
- `app.ecole-saas.com` ou `www.ecole-saas.com` → landing page générique (login général, choisir son école)

**Implémentation** :
- **DNS** : un record wildcard `*.ecole-saas.com → cname.vercel-dns.com`. Vercel auto-provisionne le SSL (Let's Encrypt) en quelques secondes pour chaque sous-domaine au premier hit.
- **Middleware Next.js** (`apps/web/middleware.ts`) :
  - Lit `request.headers.get('host')` → extrait le sous-domaine.
  - Si sous-domaine ∈ `['app', 'www', null]` → continue sans modification.
  - Sinon → set un header interne `x-tenant-slug` que les Server Components / Route Handlers consomment.
  - **Cas inexistant** : si le slug ne correspond à aucun tenant → 404 (page custom "École introuvable").

### 2.2 Chargement du branding

**Au démarrage de la requête** (Server Component ou route handler) :
- Lit `x-tenant-slug`.
- Appelle `GET /api/public/tenant-brand/:slug` (endpoint **non authentifié**, cache 5 min via `Cache-Control: public, max-age=300, s-maxage=300`).
- Reçoit `{ name, brand: { primaryColor, primaryHover, secondaryColor, logoUrl, faviconUrl, emailHeaderColor } }`.
- **Si tenant non trouvé** → 404.

**Pourquoi un endpoint public** : on a besoin de connaître les couleurs et le logo AVANT que l'utilisateur ne soit loggé (page de login déjà brandée). La donnée est non-sensible — seulement ce que l'école expose.

### 2.3 Injection CSS

Dans `apps/web/app/layout.tsx` (Server Component), une fois le brand chargé :

```tsx
<html lang={locale}>
  <head>
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --color-primary: ${brand.primaryColor};
        --color-primary-hover: ${brand.primaryHover};
        --color-secondary: ${brand.secondaryColor};
      }
    `}} />
    <link rel="icon" href={brand.faviconUrl ?? '/favicon.ico'} />
  </head>
  <body className="bg-background">{children}</body>
</html>
```

Les composants shadcn/ui consomment déjà des CSS variables (`--primary`, `--primary-foreground`...) — on les **remappe** dans `globals.css` :

```css
:root {
  --primary: var(--color-primary, hsl(238 70% 52%)); /* fallback = indigo-600 actuel */
  --primary-foreground: 0 0% 100%;
  ...
}
```

**Conséquence** : aucun composant existant n'a besoin de changer. Le theme s'applique à TOUT le design system.

### 2.4 Stockage des assets

**Cloudflare R2** : bucket `ecole-saas-tenant-assets`, **public-read** (accessible via URL signée à TTL long ou via custom CDN domain).
- Path : `tenants/<tenantId>/logo.png`, `tenants/<tenantId>/favicon.ico`.
- Upload via **presigned PUT URL** générée par l'API : `POST /api/admin/tenant/branding/upload-url` → renvoie `{ uploadUrl, finalUrl }` valides 5 min.
- Le SCHOOL_ADMIN upload directement sur R2 depuis le navigateur (pas de transit par notre serveur, économise bande passante).
- Validation côté API : taille max 500 KB, formats `.png` / `.svg` / `.jpg`, dimensions logo recommandées 512×512.

### 2.5 Endpoints API (déjà préparés conceptuellement dans D19)

| Méthode | Path | Rôle | Description |
|---|---|---|---|
| `GET` | `/api/public/tenant-brand/:slug` | (public) | Branding pour la résolution sous-domaine, cache CDN 5 min |
| `GET` | `/api/admin/tenant/branding` | SCHOOL_ADMIN | Lire le branding de SON tenant |
| `PATCH` | `/api/admin/tenant/branding` | SCHOOL_ADMIN | Mettre à jour `Tenant.brand` (validé Zod) |
| `POST` | `/api/admin/tenant/branding/upload-url` | SCHOOL_ADMIN | Générer un upload R2 presigned |
| `GET` | `/api/admin/super/tenants/:id/branding` | SUPER_ADMIN | (V11) override / audit cross-tenant |

L'isolation multi-tenant existante (Prisma extension TENANT_SCOPED_MODELS) protège automatiquement le SCHOOL_ADMIN — il ne peut éditer que son propre tenant. Le SUPER_ADMIN cross-tenant est différé en V11.

### 2.6 Page settings (UI)

Nouvelle page : `apps/web/app/(app)/settings/branding/page.tsx` accessible aux SCHOOL_ADMIN uniquement.

Contenu :
- **Card "Logo & favicon"** : aperçu actuel, bouton upload (presigned URL), preview live.
- **Card "Couleurs"** : 3 color pickers (primary / primaryHover / secondary), preview live d'un bouton de référence, validation hex `#RRGGBB`.
- **Card "Apparence email"** : couleur d'en-tête email (utilisée par les templates Resend).
- **Card "Custom domain"** : disabled en V1.6, badge "Premium — disponible en V11".
- Bouton "Enregistrer" → `PATCH /api/admin/tenant/branding`, toast succès, rechargement de la page pour appliquer.
- Bouton "Réinitialiser au thème par défaut" → reset `Tenant.brand` à `null` (revient au thème indigo générique).

### 2.7 Emails brandés

Les templates Resend existants (`apps/api/src/common/email/templates/*.tsx`) reçoivent déjà `tenantName` en prop. On ajoute `brand: { logoUrl, emailHeaderColor }` au composant `EmailLayout`. Si `brand.logoUrl` présent → affiché en header. Sinon → texte "École SaaS" générique. **Backward compatible** : tenant sans brand = comportement actuel.

---

## 3. Mobile — détails techniques (Option A + stratégie M1)

### 3.1 Le problème central

Une école = **3 apps mobiles** dans la doctrine du projet (Parent / Teacher / Admin). 100 écoles = 300 apps si on suit Option B. **Apple et Google ne sont PAS conçus pour ça** :

- **Apple App Store** : chaque app demande un review (1-3 jours, parfois plus en première soumission), un Bundle ID unique, des screenshots, une description, une politique de confidentialité, des in-app purchases declared, etc. Apple peut rejeter des "apps trop similaires" → risque de bannissement.
- **Google Play** : plus permissif sur le review (~24h en général) mais demande aussi screenshots / privacy policy / data safety form par app.
- **Coûts** : Apple Developer Program = **99 USD/an** (illimité d'apps mais review individuel), Google Play = **25 USD one-time**.

**Conclusion** : on ne soumet PAS une app par école. On fait **3 apps publiques pour TOUTES les écoles**, et on theme à l'exécution.

### 3.2 Stratégie M1 — 1 binaire multi-tenant par persona (recommandée pour V1.6)

**Concept** :
- 3 apps publiques aux stores :
  - `École SaaS — Parents` (bundle id `com.ecolesaas.parents`)
  - `École SaaS — Enseignants` (bundle id `com.ecolesaas.teachers`)
  - `École SaaS — Direction` (bundle id `com.ecolesaas.admin`)
- Au premier lancement → écran "Code école" : l'utilisateur saisit son code (ex: `saint-exupery`) ou scanne un QR généré par l'admin de l'école.
- L'app appelle `GET /api/public/tenant-brand/saint-exupery` → reçoit le brand.
- Le brand est persisté localement (`expo-secure-store`).
- Tout le theming (couleurs, logo, nom dans la nav) bascule sur le brand du tenant.

**Avantages** :
- 3 apps maintenues. 1 release = mise à jour pour TOUTES les écoles.
- Onboarding école : 0 effort store. **5 min pour configurer son brand depuis la page web settings.**
- Économie : 99 USD/an total (vs ~300 apps × review impossible).

**Inconvénients** :
- L'icône d'app sur le téléphone reste le logo "École SaaS" générique. Pas le logo de l'école. ⚠️ Compromis accepté en V1.6.

### 3.3 Stratégie M2 — Build EAS dynamique par tenant (V11+, tier premium)

**Concept** : pour les écoles qui veulent l'icône custom sur le téléphone + leur nom dans l'App Store, on offre un service premium :
1. SCHOOL_ADMIN upload son icône (1024×1024 PNG) et écran de splash.
2. On lance un **EAS Build dynamique** avec `app.json` patché :
   ```json
   {
     "expo": {
       "name": "École Saint-Exupéry — Parents",
       "ios": { "bundleIdentifier": "com.ecolesaas.parents.saintexupery" },
       "icon": "./assets/tenants/saintexupery/icon.png"
     }
   }
   ```
3. Build → soumission via `eas submit` au compte développeur de l'école (l'école apporte SON compte Apple/Google).
4. Tarification : "setup premium" facturé une fois par école au tenant.

**Pourquoi V11 et pas V1.6** :
- Demande un compte Apple Developer Program (99 USD/an) par école qui adhère.
- Demande review Apple par école (1-3 j).
- Implique un dashboard interne pour suivre les builds EAS, les états de submission, les renouvellements de certificats.
- 80 % des écoles ne paieront jamais pour ça.

### 3.4 Stratégie M3 — Apps React Native bare par tenant ❌ rejetée

Idée d'avoir un repo / un build complet par école. **Identique à Option B web** : ingérable au-delà de 5 écoles. Rejetée même pour V11+.

### 3.5 Implémentation runtime mobile (M1)

**Étape 1 — Écran de sélection d'école** (`apps/mobile/app/(onboarding)/school-code.tsx`) :
- Input texte "Code de votre école"
- Bouton "Scanner un QR" (utilise `expo-camera`)
- Bouton "Continuer"
- Validation : appel `GET /api/public/tenant-brand/:slug`. Si 404 → erreur "École introuvable". Sinon → persist brand + slug, redirect vers login.

**Étape 2 — Theme provider** :
- Hook `useTenantBrand()` qui lit le brand depuis `expo-secure-store`.
- `<ThemeProvider value={brand}>` au top de l'app, expose `colors.primary`, `colors.secondary`, etc.
- NativeWind config : utilise des CSS-vars-like via `theme.extend.colors.primary: 'var(--color-primary)'` (à confirmer sur la doc NativeWind v4).
- Logo de l'école affiché en header de la nav.

**Étape 3 — Push notifications brandées** :
- `DeviceToken` model (déjà planifié D15) a déjà `tenantId`.
- Le content du push (titre + texte) inclut désormais `[École Saint-Exupéry] Nouvelle note...` au lieu d'un générique.

**Étape 4 — Expo OTA updates** :
- On reste sur le canal OTA Expo pour pousser des hotfixes sans review store. ✅ Déjà acquis par la stack Expo.

### 3.6 Out-of-scope mobile V1.6

- ❌ Build EAS par tenant (M2 → V11+)
- ❌ Icône d'app custom par tenant (M2 → V11+)
- ❌ Deep links `https://saint-exupery.ecole-saas.com/m/...` ouvrant l'app : déjà supporté nativement via universal links si on configure `apple-app-site-association` une fois (deferred V11)

---

## 4. DB + API — détails techniques

### 4.1 Migration additive

```prisma
model Tenant {
  // ... champs existants
  brand Json?  // null = thème par défaut (indigo-600 actuel)
}
```

Migration : **additive uniquement** (`ADD COLUMN brand JSONB NULL`). **Zéro impact backward** sur V1.5.

### 4.2 Schéma TypeScript

```typescript
// packages/shared/src/schemas/tenant-brand.ts
export const TenantBrandSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),       // ex: #4f46e5
  primaryHover: z.string().regex(/^#[0-9a-f]{6}$/i),       // ex: #4338ca
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),     // ex: #1e1b4b
  logoUrl: z.string().url().refine(
    (u) => u.startsWith(process.env.R2_PUBLIC_URL ?? ''),
    'Logo doit être dans le bucket R2 ecole-saas-tenant-assets',
  ).nullable(),
  faviconUrl: z.string().url().nullable(),
  emailHeaderColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  customDomain: z.string().nullable(),  // V11 — ignoré en V1.6
});

export type TenantBrand = z.infer<typeof TenantBrandSchema>;
```

**Anti-SSRF** : `logoUrl` et `faviconUrl` doivent commencer par l'URL publique R2. Empêche un attaquant de mettre `logoUrl = 'http://internal-metadata/admin'` qui serait fetché par notre backend (cas où un cron rebuild de cache pull les images).

### 4.3 Validation côté serveur

`PATCH /api/admin/tenant/branding` :
1. Auth required (SCHOOL_ADMIN ou SUPER_ADMIN).
2. Body validé via `TenantBrandSchema.partial()` (édition partielle possible).
3. `tenantId` extrait du JWT (zero risque de cross-tenant).
4. Prisma update : `tenant.update({ where: { id: tenantId }, data: { brand: { ...existing, ...patch } } })`.
5. Invalidation du cache CDN pour `/api/public/tenant-brand/:slug` via `revalidatePath` ou `revalidateTag('tenant-brand-' + slug)`.
6. Audit log : `tenant.brand.updated`, metadata = champs modifiés (pas les valeurs full pour économiser).

### 4.4 Isolation et sécurité

- Prisma client extension TENANT_SCOPED_MODELS : Tenant est déjà géré (chaque user ne voit que son tenant).
- Le SCHOOL_ADMIN édite `Tenant.brand` de son propre tenant — l'extension `where: { id: ctx.tenantId }` est appliquée automatiquement.
- Le SUPER_ADMIN cross-tenant : **deferred V11** (admin panel dédié).
- L'endpoint `GET /api/public/tenant-brand/:slug` est **non authentifié mais rate-limited** (Throttler : 60 req/min/IP) pour éviter scraping massif.

### 4.5 Performance

- **Cache HTTP** : le `GET /api/public/tenant-brand/:slug` a `Cache-Control: public, max-age=300, s-maxage=300`. Vercel CDN cache 5 min. → Pas de hit DB sur les hits suivants.
- **Cache Redis** : optionnel, déjà dispo via Upstash si on veut descendre à <50ms. Pas critique en V1.6.
- **Latence ajoutée** : ~30 ms première requête (DB), ~5 ms suivantes (CDN). Acceptable.

---

## 5. Découpage en vagues

### 5.1 V1.6 — Fondations runtime ⭐ (≈ 1.5 j)

**Scope** :
1. Migration DB `Tenant.brand JSON?` (additive, sans downtime). [0.5h]
2. Endpoint public `GET /api/public/tenant-brand/:slug` + cache headers. [1h]
3. Endpoints admin `GET/PATCH /api/admin/tenant/branding`. [1.5h]
4. Endpoint upload presigned URL R2 + bucket `ecole-saas-tenant-assets` provisionné. [1.5h]
5. DNS wildcard `*.ecole-saas.com → cname.vercel-dns.com` + Vercel domain config. [0.5h, manuel via dashboards]
6. Middleware Next.js de résolution sous-domaine → `x-tenant-slug`. [1h]
7. Layout web `(app)/layout.tsx` + `(auth)/layout.tsx` chargent le brand et injectent les CSS vars. [2h]
8. Page settings UI `/settings/branding`. [2h]
9. Templates Resend brandés (`EmailLayout` reçoit `brand`). [1h]
10. Mobile : écran "code école" + persistance brand + theme provider. [3h]
11. Tests :
    - E2E web : créer un tenant, set brand, vérifier que le sous-domaine affiche les bonnes couleurs. [1h]
    - Unit : Zod schema, anti-SSRF logoUrl. [0.5h]
12. Doc :
    - Mise à jour `apps/web/README.md` (wildcard DNS).
    - ADR `0003-tenant-white-label.md`.
13. Critères d'acceptation :
    - [ ] Une nouvelle école `saint-exupery` est créée → `saint-exupery.ecole-saas.com` répond, SSL auto, redirection 404 si slug inconnu.
    - [ ] SCHOOL_ADMIN se logge → page settings branding → upload logo + 3 couleurs → save → les pages /login et /dashboard affichent les nouvelles couleurs.
    - [ ] L'app mobile (build dev/Expo Go) demande code-école, accepte `saint-exupery`, affiche le logo dans la nav.
    - [ ] Email de bienvenue / reset password / export RGPD utilise le logo et la couleur header de l'école.
    - [ ] Isolation : un user de l'école A ne peut JAMAIS éditer le brand de l'école B.
    - [ ] CI verte (lint + type + build + tests + e2e).
    - [ ] Lighthouse mobile ≥ 90 sur `/login` brandée (regression test).

### 5.2 V11 — Hardening + premium tier (≈ 1 j en plus de A)

**Scope** (en plus des fondations V1.6) :
1. Custom domain : endpoint `POST /api/admin/tenant/custom-domain` qui appelle l'API Vercel pour ajouter `portail.ecole-saint-exupery.fr` au projet `jardin`. Status polling. UI dans settings.
2. Brand audit log dédié (chaque change → ligne dans `AuditLog`).
3. SUPER_ADMIN cross-tenant : page `/admin/tenants/:id/branding` pour intervenir si besoin.
4. (Optionnel — tier premium) M2 EAS Build dynamique par tenant. À évaluer en V11 selon traction commerciale.

### 5.3 Hors scope (jamais ou très loin)

- ❌ M3 builds RN bare par tenant.
- ❌ Per-school marketing site auto-généré (`saint-exupery.ecole-saas.com/marketing`).
- ❌ Per-school email domain (DKIM/SPF/DMARC par tenant) — trop d'ops, peu d'écoles le demanderont.
- ❌ Per-school SMS sender ID custom (Twilio gère ça mais c'est un cauchemar de provisioning).
- ❌ Theme avancé (typo custom, illustrations custom). On limite aux couleurs + logo en V1.6.

---

## 6. Risques & coûts

### 6.1 Risques techniques

| ID | Risque | Impact | Mitigation |
|---|---|---|---|
| R1 | Wildcard DNS pris en SSL Vercel | Site cassé sur premier hit | Tester avec un sous-domaine de dev (`test.ecole-saas.com`) avant prod |
| R2 | Mauvaise sanitization couleurs → CSS injection / XSS | XSS via `<style>` | Zod regex stricte `/^#[0-9a-f]{6}$/i` côté serveur ET client ; jamais d'insertion brute |
| R3 | logoUrl pointant ailleurs que R2 → SSRF si on prefetch côté serveur | Fuite info / RCE | Validation `startsWith(R2_PUBLIC_URL)` côté serveur |
| R4 | Cache CDN incohérent après PATCH branding | UI montre vieille couleur 5min | `revalidateTag('tenant-brand-' + slug)` sur le PATCH |
| R5 | Mobile : l'app pré-login ne sait pas quel tenant → quelle URL d'API ? | App cassée au démarrage | URL API fixe (`https://api.ecole-saas.com`), le tenant est résolu après par token |
| R6 | Conflit slug / réservés (`api`, `www`, `app`, `admin`) | Tenant inaccessible | Whitelist en validation slug + migration check |
| R7 | Sous-domaine = pas dans l'historique navigateur ➜ user-confusion ("où je tape mon URL ?") | UX | Page `/` racine offre un picker "Quelle est votre école ?" |
| R8 | RGPD : logos de mineurs uploadés par erreur | Risque légal | Doc + warning UI "Pas de photo d'élèves dans le logo" |

### 6.2 Coûts financiers

**V1.6 — Option A initiale** :
- Vercel : **0 €** (plan Hobby suffit, sous-domaines illimités, SSL gratuit). Si on dépasse les limits Hobby (bande passante 100GB/mois) on passera à Pro à 20 USD/mois — mais ça n'a aucun lien avec le nombre d'écoles, juste le trafic global.
- Cloudflare R2 : storage 0,015 USD/GB/mois après les 10 GB gratuits. 1000 écoles × 550 KB ≈ 550 MB → **0 €**.
- DNS : Cloudflare gratuit pour le record wildcard.
- Total V1.6 : **0 €/mois additionnel.**

**V11 — Custom domain (Option C)** :
- Vercel Pro 20 USD/mois pour domaines custom illimités. Compense si on a >5 écoles premium qui paient. Sinon, refacturé.
- Total V11 : **20 USD/mois si on active premium**, ou 0 € sinon.

**V11 — M2 EAS Build par tenant (optionnel)** :
- EAS Build : 99 USD/mois plan "Production" si on dépasse les builds gratuits. Probablement 1 école premium par mois = OK avec free tier au début.
- Apple Developer Program : 99 USD/an par compte. **L'école paie son propre compte** (ou on le refacture).
- Total V11 EAS : **0-99 USD/mois selon volume**, idéalement refacturé.

### 6.3 Coûts en effort humain

| Effort | V1.6 | V11 | Total |
|---|---|---|---|
| Dev | 1.5 j | 1 j (custom domain) | 2.5 j |
| Dev M2 EAS (optionnel V11+) | — | 2 j | +2 j |
| Ops par école nouvelle | 0 min | 0 min (premium = 30 min de submit) | ≈ 0 |
| Onboarding école côté utilisateur | 5 min via UI settings | idem + custom domain config (30 min avec leur registrar) | OK |

**Comparaison avec décision D19 actuelle (V11 only, 5-6 j)** :
- D19 prévoyait tout faire en V11 pour 5-6 j.
- Le découpage V1.6 (1.5 j) + V11 (1 j) coûte **2.5 j au total + 0 j de retrofit** vs 5-6 j en bloc. **Économie nette : ~3 j** sur la durée du projet, avec en plus l'avantage d'avoir le branding dispo dès V1.6 (utilisable comme argument commercial dès les démos V2+).
- Le 3-4 j de "retrofit cost" évoqué dans D19 disparaît si on fait V1.6 maintenant : on n'a pas à revisiter tous les composants V2-V10 plus tard, ils naissent déjà avec le theme runtime.

---

## 7. TL;DR (à copier dans le PR)

**Recommandation : Option A (runtime white-label) en V1.6, Option C (premium custom domain) en V11+ si besoin business.**

- **Web** : 1 binaire Next.js sur Vercel, sous-domaine `*.ecole-saas.com` (wildcard DNS + SSL Vercel auto), middleware résout le tenant via `request.headers.host`, CSS variables injectées dans `layout.tsx` après lecture de `Tenant.brand` depuis l'API.
- **Mobile** : 3 apps publiques aux stores (Parent / Teacher / Admin), strategy M1 — écran "code école" au premier lancement, brand persisté local, theme runtime. **Pas de submission per-école**. M2 (EAS Build par tenant pour icône custom + nom store) en V11+ pour tier premium uniquement.
- **DB** : 1 colonne JSON additive `Tenant.brand`, schéma Zod strict (couleurs hex, URLs R2 only, anti-SSRF).
- **API** : 1 endpoint public cacheable + 3 endpoints admin protégés par RBAC + isolation Prisma extension.
- **Effort total** : **1.5 j en V1.6** + 1 j en V11 = **2.5 j** (vs 5-6 j si tout V11). Économie ~3 j + branding dispo dès la phase démo V2+.
- **Coût infra** : **0 €/mois additionnel** en V1.6, optionnellement 20 USD/mois en V11 pour custom domains.
- **Risques principaux** : XSS via couleurs (mitigé par Zod regex), SSRF via logoUrl (mitigé par check R2 prefix), cache CDN obsolète après update (mitigé par revalidateTag).

**Question pour le user** : où on l'insère ? Trois choix.

1. **V1.6 avant V2** (recommandé) — White-label livré juste après V1.5, V2 mobile/Élèves naît déjà branded.
2. **V1.6 après V2** — V2 d'abord pour livrer le module Élèves, white-label en V1.7 / V2.5.
3. **V11 (statu quo D19)** — On reste sur la décision actuelle, accepte le 3-4 j de retrofit plus tard.

---

## 8. Annexes

### 8.1 Lien avec ADRs et docs existants

- `docs/roadmap.md` — section "Décisions techniques verrouillées" (D19 à amender selon choix).
- `docs/adr/0002-v1.5-recovery-invite.md` — V1.5 ne touche pas au branding (cohérent).
- Cette spec deviendra **ADR 0003** une fois validée et implémentée.

### 8.2 Glossaire

- **White-label runtime** : le branding est résolu à l'exécution, pas au build.
- **Tenant slug** : identifiant URL-friendly de l'école (`saint-exupery`), unique dans la BDD, validé contre une whitelist de mots réservés.
- **EAS Build** : Expo Application Services — service de build cloud pour Expo / React Native.
- **Wildcard DNS** : record `*.example.com` qui matche `n'importe-quoi.example.com` (DNS RFC 4592).
