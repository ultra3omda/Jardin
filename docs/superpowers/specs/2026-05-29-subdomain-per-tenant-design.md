# Design — « 1 web app par école à `<slug>.klasso.tn` + apps mobile partagées »

- **Date** : 2026-05-29
- **Statut** : Approuvé (direction validée par l'utilisateur — à relire avant `writing-plans`)
- **Piste** : Track 1 / 2 (Track 2 = remédiation CRUD + modules manquants, spec séparé)
- **Approche retenue** : **A** — le sous-domaine pilote *branding + redirection*, le JWT reste l'**unique** source d'isolation.
- **Spécifications liées** :
  - `docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md`
  - `docs/superpowers/runbooks/v1.7-b-dns-activation.md`
  - `docs/adr/0007-*` (blocage DNS `.tn` / Vercel wildcard)

---

## 0. TL;DR

Chaque école créée doit « avoir » son application web à `<slug>.klasso.tn` et les apps mobiles (Parent / Enseignant / Direction). Aujourd'hui :

- Le **web** a déjà un résolveur de sous-domaine **construit mais dormant** (gated par `ENABLE_SUBDOMAIN_RESOLVER` + `NEXT_PUBLIC_BASE_DOMAIN`, tous deux non définis en prod), et ce résolveur **réécrit TOUTES les routes** (y compris `/dashboard`) vers `/t/{slug}/...` → **404 sur les pages authentifiées** s'il est activé tel quel.
- Le **mobile** est **une seule app** Expo (`tn.klasso.app`) ; les onglets sont choisis au **build** via `EXPO_PUBLIC_PERSONA`, ce qui peut **contredire** le rôle réellement connecté.
- Le **CORS** API ne connaît pas `*.klasso.tn` (liste statique), et le **CSP** web pointe encore vers un host API **périmé** (`api-klasso.railway.app` au lieu de `api.klasso.tn`).

**Correction** : rendre le sous-domaine *cosmétique* (branding pré-auth + redirection), sans jamais en faire une source d'isolation ; corriger le middleware pour qu'il ne réécrive **que** les pages pré-auth brandées ; remplacer la sélection d'onglets mobile *build-time* par une sélection *runtime* basée sur `user.role` ; ouvrir le CORS à `*.klasso.tn` et réparer le CSP. **Aucune migration Prisma.** L'activation finale est **gated par le DNS** (`.tn`, 24-72h, dépendance migration email — voir ADR 0007).

---

## 1. Contexte & problème

### 1.1 Topologie prod actuelle
- **Web** : `klasso.tn` (Vercel — déploiement `ecole-saas-weld.vercel.app`, projet `prj_DsqPNx90qY3R98l71Pr92DHPoE7R`).
- **API** : `https://api.klasso.tn` (Railway). ⚠️ `api-klasso.railway.app` est **périmé/faux**.
- **Mobile** : 1 binaire Expo `tn.klasso.app`, pas de `eas.json`, pas de build par tenant.

### 1.2 Résolution de tenant (mécanisme réel)
- Source **unique** = le claim `tenantId` du **JWT**.
- Application : *Prisma client extension* sur `TENANT_SCOPED_MODELS` (`User`, `RefreshToken`, `AuditLog`, `Student`, `ParentStudent`) + `AsyncLocalStorage` via `TenantContextService` / interceptor.
- **Jamais** dérivé du header `Host`. ➜ Décision structurante : on **ne change pas** ce modèle.

### 1.3 Ce qui existe déjà (web)
- `apps/web/middleware.ts` (81 lignes) :
  - `PROTECTED_PREFIXES = ['/dashboard']`, `AUTH_PREFIXES = ['/login','/register']`.
  - `BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn'`.
  - `SUBDOMAIN_RESOLVER_ENABLED = process.env.ENABLE_SUBDOMAIN_RESOLVER === 'true'`.
  - **BUG** : quand activé, si un slug est extrait du host, il `rewrite` **tout** (`/dashboard` inclus) vers `/{locale}/t/{slug}{stripped}` → 404.
  - Matcher : `['/((?!api|_next|_vercel|.*\\..*).*)']`.
- `apps/web/lib/tenant/extract-tenant-slug.ts` : `extractTenantSlugFromHost(host, baseDomain)`, `RESERVED_SLUGS = {www, app, api, admin, assets, docs, status, mail, support, dashboard}`, `SLUG_REGEX` validé par tests unitaires.
- `apps/web/lib/tenant/` : `brand.ts` (`getTenantBrand(slug)` → `GET {API_URL}/api/public/tenant-brand/{slug}`, cache 5 min), `brand-style-tag.ts`, `hex-to-hsl.ts`.
- `apps/web/app/[locale]/(auth)/t/[slug]/` : **5 pages pré-auth brandées** (`login`, `register`, `forgot-password`, `reset-password`, `verify-email`) + `layout.tsx` (appelle `getTenantBrand`, `notFound()` si slug inconnu) + `not-found.tsx`. **Branding uniquement** — aucune résolution de tenant, aucun dashboard.
- `apps/web/app/[locale]/(app)/` : 45 pages authentifiées (dashboard, students, parents, teachers, classes, …).

### 1.4 Ce qui existe déjà (API)
- `apps/api/src/common/config/configuration.ts` :
  - `KLASSO_KNOWN_ORIGINS = ['https://ecole-saas-weld.vercel.app','https://klasso-mobile.vercel.app','https://klasso.tn']` + `CORS_ORIGIN` env → **tableau statique dédupliqué**. **Pas de wildcard `*.klasso.tn`** (le commentaire en tête de fichier flagge déjà cet endroit comme « le futur emplacement »).
  - `webAppUrl = process.env.WEB_APP_URL ?? 'https://klasso.tn'` (corrigé récemment, commit `a5847a3`).
- `apps/api/prisma/schema.prisma` : `Tenant` a `slug @unique` + `@@index`, **mais aucun champ** `customDomain` / `subdomain` / `status`. ➜ on réutilise `slug`, **pas de migration**.

### 1.5 Ce qui existe déjà (mobile)
- 1 app Expo `tn.klasso.app`. Tenant choisi via `(onboarding)/school-code.tsx` → slug → `GET /api/public/tenant-brand/:slug` → login avec `tenantSlug` → JWT.
- **Problème** : `EXPO_PUBLIC_PERSONA` (build-time) choisit les onglets (`lib/tabs.ts`) → peut **contredire** `user.role`.

### 1.6 Blocage DNS (ADR 0007)
Vercel ne peut pas valider un CNAME wildcard via le DNS externe OVH `.tn` sans basculer sur le DNS Vercel, ce qui casserait l'email OVH → lié à une migration Google Workspace. Apex `A → 76.76.21.21`, wildcard `→ cname.vercel-dns.com`. Activation : runbook `v1.7-b-dns-activation.md` (~5 min de config + 24-72h de propagation `.tn`).

---

## 2. Décisions

| # | Décision | Justification |
|---|---|---|
| **D1** | **Mobile = apps partagées multi-persona**, tenant résolu **au login**. **Pas** 3 binaires par école. | Un binaire = un bundle ID ; impossible de générer un build par école. Le modèle partagé est déjà construit. |
| **D2** | **Web** : finir le code maintenant, **activer le DNS ensuite**. | Le DNS `.tn` est bloqué (24-72h + migration email). Le code peut être mergé dormant. |
| **D3** | **Isolation = JWT `tenantId`, source UNIQUE.** Le sous-domaine n'isole **jamais**. | Dériver le tenant du `Host` = faille (spoofing d'en-tête, cache poisoning). Modèle actuel sûr et testé. |
| **D4** | **Middleware sélectif** : ne réécrire vers `/t/{slug}` **que** les préfixes pré-auth brandés. Les pages authentifiées passent inchangées. | Corrige le bug « réécrit tout → 404 sur /dashboard ». |
| **D5** | **Cookie `.klasso.tn`** mémorisant le slug actif + **guard de cohérence** (slug du host vs `tenant.slug` du JWT). | Évite qu'un utilisateur du tenant A voie le shell brandé du tenant B. UX cohérente cross-subdomain. |
| **D6** | **CORS wildcard `*.klasso.tn`** (callback fonction) + **fix CSP** vers le vrai host API + `wss://`. | Sans ça, les `<slug>.klasso.tn` sont CORS-bloqués et le WebSocket messagerie cassé. |
| **D7** | **Aucune migration Prisma.** Réutiliser `Tenant.slug`. | `slug` est déjà `@unique`/indexé ; pas besoin de `customDomain`. Respecte le checkpoint 🛑 « ne pas modifier le schéma sans raison ». |

---

## 3. Hors-périmètre (non-objectifs)

- ❌ Domaines custom arbitraires (`monecole.com`) — seulement `*.klasso.tn`.
- ❌ Résolution de tenant via `Host` (cf. D3).
- ❌ 3 binaires mobiles par école (cf. D1).
- ❌ Changement du modèle d'isolation (Prisma extension + AsyncLocalStorage inchangés).
- ❌ **Activation DNS dans ce lot** — gated, suit le runbook séparé.
- ❌ Track 2 (CRUD + modules) — spec dédié.

---

## 4. Architecture retenue (Approche A)

```
Navigateur → ecole.klasso.tn/login
   │  (Vercel sert l'app web unique — wildcard *.klasso.tn → même déploiement)
   ▼
apps/web/middleware.ts (résolveur sélectif)
   │  host=ecole.klasso.tn, path=/login (pré-auth brandé)
   │  → rewrite interne vers /{locale}/t/ecole/login   (branding seulement)
   ▼
Page /t/[slug]/login → getTenantBrand(slug) → thème injecté
   │  login (email + password [+ tenantSlug])
   ▼
API api.klasso.tn/auth/login
   │  CORS: origin ecole.klasso.tn accepté via callback ^https://[a-z0-9-]+\.klasso\.tn$
   ▼
JWT { tenantId, role, … }  ← SEULE source d'isolation
   │  cookie domaine .klasso.tn = { activeSlug: ecole }
   ▼
Redirection /dashboard (sur ecole.klasso.tn)
   │  middleware: host=subdomain, path=/dashboard (authed) → PASSTHROUGH (pas de rewrite)
   │  guard client: si tenant.slug(JWT) ≠ slug(host) → logout/redirect vers le bon host
   ▼
App shell (app) — tenant déjà résolu par le JWT, branding via cookie/JWT
```

Mobile (1 binaire, 3 personas) :
```
App Expo → (onboarding) school-code → slug → brand → login(tenantSlug) → JWT{role}
   → getTabsForRole(user.role)  (runtime, remplace EXPO_PUBLIC_PERSONA build-time)
```

---

## 5. Conception détaillée

### 5.1 Middleware sélectif (`apps/web/middleware.ts`)
Introduire la liste des préfixes pré-auth brandés et **ne réécrire que ceux-là** :

```ts
const BRANDED_PREAUTH_PREFIXES = [
  '/login', '/register', '/forgot-password', '/reset-password', '/verify-email',
];

if (SUBDOMAIN_RESOLVER_ENABLED) {
  const slug = extractTenantSlugFromHost(host, BASE_DOMAIN);
  if (slug) {
    const stripped = stripLocale(path);
    const isBrandedPreauth = BRANDED_PREAUTH_PREFIXES.some(
      (p) => stripped === p || stripped.startsWith(`${p}/`),
    );
    if (isBrandedPreauth && !stripped.startsWith(`/t/${slug}`)) {
      url.pathname = locale ? `/${locale}/t/${slug}${stripped}` : `/t/${slug}${stripped}`;
      return NextResponse.rewrite(url);
    }
    // Pages authentifiées (/dashboard, (app)/*) : PASSTHROUGH — tenant via JWT.
  }
}
```
**Invariant** : sur un sous-domaine, `/dashboard` n'est **jamais** réécrit (corrige le 404). Le matcher reste inchangé.

### 5.2 Helper `buildTenantUrl` (`apps/web/lib/tenant/build-tenant-url.ts`, nouveau)
URL canonique d'un tenant selon le mode actif :
```ts
export function buildTenantUrl(slug: string, path = '/'): string {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true';
  return enabled && base
    ? `https://${slug}.${base}${path}`        // mode sous-domaine
    : `${process.env.NEXT_PUBLIC_WEB_URL ?? 'https://klasso.tn'}/t/${slug}${path}`; // fallback path
}
```
Usage : redirection post-login vers le bon host, cohérence des liens internes. (Les liens email côté API utilisent déjà `webAppUrl` + `/t/{slug}` — inchangés.)

### 5.3 Cookie `.klasso.tn` + guard de cohérence
- À la connexion réussie sur un sous-domaine, poser un cookie **domaine `.klasso.tn`** : `{ activeSlug }` (lisible cross-subdomain).
- **Guard client** (au montage du shell `(app)`) : comparer `slug(host)` au `tenant.slug` exposé par `GET /auth/me`. Si différence → `logout()` + redirection vers `buildTenantUrl(jwtSlug, '/dashboard')`.
- **R2** : nécessite que `/auth/me` expose `tenant.slug` (à vérifier — sinon l'ajouter à la réponse `me`, sans changement de schéma).

### 5.4 CORS wildcard (`apps/api/src/common/config/configuration.ts` + bootstrap CORS)
Remplacer le tableau statique par un **callback** acceptant l'allowlist statique **ou** tout sous-domaine `*.klasso.tn` :
```ts
const KLASSO_SUBDOMAIN_RE = /^https:\/\/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.klasso\.tn$/;

export function isAllowedOrigin(origin: string | undefined, allowlist: string[]): boolean {
  if (!origin) return true;                       // requêtes serveur-à-serveur / curl
  if (allowlist.includes(origin)) return true;    // KLASSO_KNOWN_ORIGINS + CORS_ORIGIN
  return KLASSO_SUBDOMAIN_RE.test(origin);        // ecole.klasso.tn, etc.
}
```
Branché dans `app.enableCors({ origin: (o, cb) => cb(null, isAllowedOrigin(o, corsOrigin)) , credentials: true })`. Apex `klasso.tn` reste couvert par l'allowlist statique.

### 5.5 Fix CSP (`apps/web/next.config.mjs`)
`connect-src` :
- **Retirer** `https://api-klasso.railway.app` (périmé).
- **Ajouter** `https://api.klasso.tn` **et** `wss://api.klasso.tn` (Socket.IO messagerie).
- Conserver Sentry ; ajouter `https://*.klasso.tn` si des appels same-host sont introduits.

### 5.6 Mobile — onglets par rôle (`apps/mobile/lib/tabs.ts`)
Remplacer la sélection *build-time* `EXPO_PUBLIC_PERSONA` par une fonction *runtime* :
```ts
export function getTabsForRole(role: UserRole): TabConfig[] { /* PARENT | TEACHER | SCHOOL_ADMIN | STAFF */ }
```
Le layout à onglets appelle `getTabsForRole(user.role)` après login → un seul binaire sert correctement les 3 personas, **les onglets correspondent toujours au rôle connecté** (plus de contradiction build-flag vs rôle).

---

## 6. Sécurité & isolation

- **Invariant central (D3)** : aucune décision d'autorisation/scoping ne lit le `Host`. Le sous-domaine est purement cosmétique (branding + redirection). Test de régression : forger `Host: autre-ecole.klasso.tn` avec un JWT du tenant A **doit** continuer à ne renvoyer que les données du tenant A.
- **CORS** : le wildcard est strictement `^https://<label>.klasso.tn$` (pas de `http`, pas de sous-sous-domaine, pas de suffixe arbitraire). `credentials: true` ⇒ pas de `*` permissif.
- **Cookie** : `Secure`, `SameSite=Lax`, domaine `.klasso.tn` ; ne contient qu'un slug (pas de secret).
- **Guard** : empêche l'affichage d'un shell brandé incohérent (UX/anti-confusion), mais l'isolation réelle reste garantie par le JWT même si le guard est contourné.

---

## 7. Tests

- **Unit** `extractTenantSlugFromHost` (déjà couvert) + `isAllowedOrigin` (accepte `ecole.klasso.tn`, rejette `evil.com`, `http://ecole.klasso.tn`, `a.b.klasso.tn` ; accepte l'allowlist statique).
- **Unit** middleware (matrice) :
  - subdomain + `/login` → rewrite `/t/{slug}/login`.
  - subdomain + `/dashboard` → **passthrough** (pas de rewrite).
  - apex `klasso.tn` + `/t/{slug}/login` → inchangé.
  - slug réservé (`www`, `app`, …) → pas de rewrite.
- **Unit** `getTabsForRole` : 4 rôles → jeux d'onglets attendus.
- **Intégration** (isolation) : `Host` spoofé + JWT tenant A ⇒ 0 fuite tenant B (test critique existant renforcé).
- **E2E** (post-activation DNS, hors lot) : `ecole.klasso.tn/login` → branding → dashboard.

> ⚠️ Blocage natif Windows : `next build`/`vitest` échouent en local (`ERR_DLOPEN_FAILED`). Valider en local par `type-check` + `lint` ; build/tests complets en CI.

---

## 8. Déploiement / rollout

1. Merger les 3 PRs **dormantes** (flags `ENABLE_SUBDOMAIN_RESOLVER` / `NEXT_PUBLIC_BASE_DOMAIN` non définis ⇒ comportement actuel inchangé).
2. **Activation** (étape séparée, gated DNS) — runbook `v1.7-b-dns-activation.md` :
   - OVH : wildcard `*.klasso.tn → cname.vercel-dns.com` (dépend migration email — ADR 0007).
   - `vercel domains add *.klasso.tn`.
   - Définir `ENABLE_SUBDOMAIN_RESOLVER=true`, `NEXT_PUBLIC_BASE_DOMAIN=klasso.tn`, `NEXT_PUBLIC_ENABLE_SUBDOMAIN=true` (web) ; redeploy.
   - Propagation `.tn` : 24-72h.

---

## 9. Découpage en PRs

| PR | Portée | Risque | Activable seul ? |
|----|--------|--------|------------------|
| **PR-1** | API CORS wildcard (`isAllowedOrigin`) + fix CSP host/wss (`next.config.mjs`) | Faible | ✅ (corrige aussi le WS messagerie en prod actuelle) |
| **PR-2** | Web : middleware sélectif + `buildTenantUrl` + cookie/guard | Moyen (touche middleware) | Dormant tant que flags off |
| **PR-3** | Mobile : `getTabsForRole` (runtime) | Faible | ✅ (améliore aussi le binaire actuel) |

> Note : PR-2 touche la zone multi-tenant ⇒ checkpoint 🛑, revue sécurité obligatoire. PR-1 et PR-3 apportent de la valeur **immédiate** même sans DNS.

---

## 10. Risques

| # | Risque | Mitigation |
|---|--------|-----------|
| **R1** | Le cookie `.klasso.tn` ne fonctionne pas sur `*.vercel.app` (preview) | Cookie conditionné au mode sous-domaine ; en preview/apex on reste en path-mode `/t/{slug}`. |
| **R2** | Le guard a besoin de `tenant.slug` côté client | Vérifier `/auth/me` ; l'exposer si absent (sans migration schéma). |
| **R3** | DNS `.tn` 24-72h + dépendance migration email OVH→Google Workspace | Activation gated, hors lot ; code mergé dormant ; runbook + ADR 0007. |

---

## 11. Lien avec la piste CRUD (Track 2)

Track 1 (ce doc) rend l'**enveloppe** « 1 web app + apps mobiles par école » correcte. Track 2 (spec séparé) rend le **contenu** fonctionnel : réparer les CRUD câblés à moitié / trompeurs **et** construire les modules manquants (cantine, transport, santé, sécurité, discipline, journal, activités, RH/paie, analytics). Les deux sont indépendants ; PR-1 (CORS/CSP) bénéficie aussi à Track 2 (WS messagerie). Ordre d'exécution recommandé : **PR-1 d'abord** (valeur immédiate), puis Track 2 (bugs → démos sans faux-semblant), puis activation DNS Track 1.
