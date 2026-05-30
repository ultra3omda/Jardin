# T2d — Admin SaaS (console SUPER_ADMIN plateforme) — Design

> **Statut :** Validé par l'utilisateur (2026-05-30). Plan d'implémentation en cours (`superpowers:writing-plans`).
> **Date :** 2026-05-29
> **Track :** Track 2 (capacités opérationnelles), sous-projet **T2d**.
> **Références :** `docs/superpowers/specs/2026-05-29-school-admin-crud-remediation-design.md` (T2a — pattern CRUD MVP) · `docs/superpowers/specs/2026-05-29-subdomain-per-tenant-design.md` (Track 1).

---

## 1. Objectif

Compléter la **console SUPER_ADMIN** (administration de la plateforme, cross-tenant) en remplaçant les pages encore en **démo codée en dur** par de **vraies données**, en **réutilisant l'infrastructure cross-tenant déjà en place** (le bypass `skipTenantFilter` pour `SUPER_ADMIN` existe et fonctionne). Les pages `tenants/` et `invite-tokens/` sont **déjà câblées** ; T2d traite le reste.

En une phrase : *un SUPER_ADMIN doit voir un tableau de bord plateforme, des analytics, un visualiseur d'audit et la file des demandes de démo alimentés par de vraies données cross-tenant — sans réinventer le mécanisme d'isolation.*

---

## 2. Constat (état actuel, factuel)

### 2.1 Pages `admin/` et leur état
Toutes sous `apps/web/app/[locale]/(app)/admin/` ; `admin/layout.tsx` **garde déjà** la zone (redirige les non-SUPER_ADMIN vers `/dashboard`).

| Page | État actuel |
|---|---|
| `tenants/` (+ `new/`, `[id]/`) | ✅ **Câblé** (`lib/api/admin-tenants` → proxy `/api/admin/*`) |
| `invite-tokens/` | ✅ **Câblé** (`lib/api/admin-invite-tokens`) |
| `page.tsx` (dashboard plateforme) | ❌ Démo : `PLATFORM_STATS`, `TENANTS` codés en dur |
| `analytics/` | ❌ Démo : `MONTHLY_METRICS`, `KPIS`, `PLAN_DIST` |
| `audit/` | ❌ Démo : `AUDIT_LOG` codé en dur, filtrage client uniquement |
| `demo/` | ❌ Démo : `INITIAL_REQUESTS` + `useState` local **alors qu'un vrai module `demo-requests` existe** (page non branchée) |
| `branding/` | ❌ Démo : branding **plateforme**, état local, `handleSave` ne fait **aucun appel API** |

### 2.2 Backend existant
- `apps/api/src/admin/admin.module.ts` → `TenantsController`/`TenantsService` (route `admin/tenants`, écrit dans `AuditLog` à la création) + `InviteTokensController`/`InviteTokensService` (route `admin/invite-tokens`). Tous **`@Roles(UserRole.SUPER_ADMIN)`**.
- `apps/api/src/tenant-brand/` → branding **par tenant** (route `admin/tenant/branding`), scopé au `tenantId` de l'appelant ; **rejette explicitement** un SUPER_ADMIN sans tenant (« cross-tenant panel deferred to V11 »).
- `apps/api/src/demo-requests/` → module réel existant (la page `admin/demo` ne l'utilise pas).
- **Absents** : module analytics/dashboard plateforme ; **contrôleur de lecture `AuditLog`** (l'audit est aujourd'hui **write-only**).

### 2.3 Schéma Prisma
- `Tenant` : `id, name, slug, type, locale, timezone, brand Json?, deletedAt`. **Pas** de `plan`/`status`/`mrr`, pas de colonnes `logoUrl`/`primaryColor` (le branding vit dans `brand` JSON, typé `TenantBrand` dans `@ecole-saas/shared`).
- `AuditLog` : `id, tenantId?, userId?, action, resource, metadata Json?, ip, userAgent, createdAt` ; index `[tenantId,createdAt]`, `[action,createdAt]`. **Existe et est écrit, mais aucune API de lecture.**
- `InviteToken` : complet.

### 2.4 Infra cross-tenant — DÉJÀ en place (fait critique)
- `UserRole.SUPER_ADMIN` ; `User.tenantId` **nullable** (super-admin sans tenant).
- `auth/interceptors/tenant-context.interceptor.ts` : `skipTenantFilter = (user.role === SUPER_ADMIN)`.
- `common/tenant/tenant-context.service.ts` : `TenantContext` via AsyncLocalStorage, `shouldSkipTenantFilter()`.
- `common/prisma/tenant.extension.ts` : injecte `where.tenantId` sur les modèles tenant-scoped **sauf** si `skipTenantFilter`, et **lève une erreur « Tenant isolation breach »** si un `tenantId` explicite ne correspond pas au contexte. `TenantsService.list()` lit déjà **sans scope** (cross-tenant).

> **Conséquence majeure :** T2d **n'invente aucun mécanisme d'isolation**. Le cross-tenant pour SUPER_ADMIN est un **chemin existant, testé et borné**. T2d ne fait qu'ajouter des lectures agrégées qui s'appuient dessus.

---

## 3. Décisions verrouillées (entrées de ce design)

| Décision | Choix retenu |
|---|---|
| **Mécanisme cross-tenant** | **Réutilisé tel quel** (`skipTenantFilter` SUPER_ADMIN). Aucun nouveau bypass. C'est **le seul** endroit où l'isolation est volontairement franchie, par SUPER_ADMIN uniquement. |
| **Migrations Prisma** | **Évitées au maximum.** Audit (lecture) et Demo (câblage) = **aucune migration**. Analytics MRR/plan/statut = **dérivé sans migration** en MVP ; tout champ ajouté au `Tenant` (plan/statut/MRR réel) = **🛑 reporté/optionnel**. |
| **Branding plateforme** | **Dé-prioritisé / clarifié** : le branding **par tenant** existe déjà et est câblé. La page `admin/branding` plateforme est soit retirée du périmètre, soit transformée en simples *defaults* (décision en §4.3). |
| **Pattern** | Réutilise le pattern d'erreurs/états de T2a ; pages alimentées par le proxy `admin` existant. |
| **Surface** | **Web uniquement.** SUPER_ADMIN utilise `MINIMAL_TABS` sur mobile ; la console SaaS reste desktop/web. |

---

## 4. Périmètre

### 4.1 Inclus (par ordre de valeur / coût)

| # | Cible | Backend nécessaire | Migration ? |
|---|---|---|---|
| 1 | **Visualiseur d'audit** (`audit/`) | **Nouveau** contrôleur de **lecture** `AuditLog` : `GET /api/admin/audit` avec filtres (tenant, action, plage de dates) + pagination | **Non** (modèle existe) |
| 2 | **Demandes de démo** (`demo/`) | **Câbler** la page sur le module `demo-requests` **existant** (liste + changement de statut) | **Non** |
| 3 | **Dashboard plateforme** (`page.tsx`) | **Nouveau** endpoint d'**aperçu** : comptes cross-tenant (nb tenants, users, élèves, tenants actifs) via `skipTenantFilter` | **Non** (dérivé par `count`) |
| 4 | **Analytics** (`analytics/`) | **Nouveau** endpoint de **métriques dérivées** : évolution des tenants (par `createdAt`), répartition par `type`/`locale` | **Non** (dérivé) |

### 4.2 Reporté / optionnel (nécessiterait migration → 🛑)
- **MRR / plan / statut d'abonnement réels** : aucun champ en base. Le vrai MRR dépend de la **facturation des abonnements plateforme** (≠ facturation parents V8) → **reporté** (lié au futur module billing plateforme). En MVP, l'analytics affiche ce qui est **dérivable sans migration** et marque explicitement « MRR/plan : à venir ».

### 4.3 Branding plateforme (`admin/branding`)
- **Décision MVP : retirer la page du périmètre actif** (ou la rediriger vers le branding **par tenant** existant). Raison : le white-label réel est **par tenant** (déjà livré). Un branding « plateforme » global n'a pas de backing et peu de valeur immédiate. *(Si l'utilisateur veut des defaults plateforme, c'est une migration `Tenant`/settings → 🛑, traitée séparément.)*

### 4.4 Hors-périmètre
- **Modification de l'isolation** (le mécanisme existant est réutilisé tel quel).
- **Billing plateforme / abonnements SaaS** (MRR réel) → projet dédié ultérieur.
- **Mobile** (console web only).
- **Aucune** modification CI / `package.json` racine.

---

## 5. Architecture & pattern

### 5.1 Backend (NestJS) — extension du module `admin`
- **`AuditController`** (lecture) : `GET /api/admin/audit`, `@Roles(SUPER_ADMIN)`, filtres + pagination, lecture cross-tenant via `skipTenantFilter`. **La consultation d'audit est elle-même tracée** (méta : qui a consulté quoi).
- **`PlatformAnalyticsController`** : `GET /api/admin/overview` (compteurs) + `GET /api/admin/analytics` (séries dérivées), `@Roles(SUPER_ADMIN)`, agrégations cross-tenant.
- **Demo** : pas de nouveau backend — la page consomme le module `demo-requests` existant via le proxy.
- Tous calqués sur les contrôleurs `admin` existants (Swagger, RBAC, `getRequestMeta`).

### 5.2 Proxy web
Le catch-all **existant** `apps/web/app/api/admin/[[...action]]/route.ts` (passthrough Bearer → `${NEXT_PUBLIC_API_URL}/api/admin/*`) **couvre déjà** les nouvelles routes `admin/audit`, `admin/overview`, `admin/analytics` sans nouveau fichier proxy.

### 5.3 Web — pages réelles (pattern T2a)
- `audit/` : liste paginée + filtres **serveur** (plus de filtrage client sur un tableau figé) ; états loading/empty/error+retry ; suppression de `AUDIT_LOG`.
- `demo/` : liste branchée sur `demo-requests`, actions de statut persistées ; suppression de `INITIAL_REQUESTS`.
- `page.tsx` + `analytics/` : cartes/graphes alimentés par les endpoints overview/analytics ; suppression de `PLATFORM_STATS`/`TENANTS`/`MONTHLY_METRICS`/`KPIS`/`PLAN_DIST` ; les métriques non dérivables (MRR/plan) affichent un état « à venir » explicite (pas de chiffre inventé).

### 5.4 Sécurité (cœur de T2d)
- Cross-tenant **uniquement** pour `SUPER_ADMIN`, **uniquement** via le `skipTenantFilter` existant. Aucun endpoint cross-tenant n'est exposé à un autre rôle.
- Lecture d'audit **gardée RBAC** + **auditée**.
- Agrégats analytics **sans PII** (compteurs/échelles, pas de listes nominatives hors pages déjà prévues).
- Le test d'isolation multi-tenant reste vert : le bypass SUPER_ADMIN est l'**exception intentionnelle déjà couverte**, pas une régression.

---

## 6. Gestion d'erreurs & états (identique à T2a)

| État | Comportement (web) |
|---|---|
| Chargement | Skeleton (cartes/tableaux) |
| Vide | Message informatif (« Aucune entrée d'audit pour ces filtres ») |
| Erreur | Message + **Réessayer**, jamais avalée |
| Donnée non disponible (MRR/plan) | État explicite « à venir », **jamais** un chiffre fictif |
| 403 | Déjà gardé par `admin/layout.tsx` ; message clair côté API |

---

## 7. Stratégie de tests & vérification

- **Audit read** : tests unitaires (filtres, pagination, scope cross-tenant SUPER_ADMIN, refus pour autres rôles).
- **Analytics/overview** : tests des agrégations (compteurs corrects across tenants).
- **Isolation** : le test critique reste vert ; **ajout d'un test** vérifiant qu'un non-SUPER_ADMIN ne peut PAS atteindre les endpoints cross-tenant.
- **Web** : `type-check` local ; lint/build/E2E CI. E2E : login super-admin → audit filtré → demo statut → dashboard chiffres réels.
- **API** : Vitest (CI ; bloqué localement par `ERR_DLOPEN_FAILED`).

---

## 8. Plan de livraison en vagues (tranches verticales)

1 PR par cible, CI verte → merge auto. **Aucune migration en MVP** (sinon 🛑).

- **Vague 1 — Quick wins sans migration** : (1) Audit read API + page `audit/` ; (2) câblage `demo/` sur `demo-requests`.
- **Vague 2 — Vue plateforme dérivée** : (3) overview dashboard `page.tsx` ; (4) analytics dérivées `analytics/`.
- **Vague 3 — (optionnel, 🛑)** : champs `plan`/`status`/MRR sur `Tenant` + branding plateforme, **seulement** si l'utilisateur le décide (migration + projet billing plateforme).

---

## 9. Risques & points d'attention

- **Cross-tenant = surface sensible** : strictement SUPER_ADMIN, via le mécanisme existant ; revue sécurité sur chaque PR ; lecture d'audit auditée.
- **Tentation d'inventer le MRR** : interdit. Pas de champ → pas de chiffre. État « à venir » jusqu'au module billing plateforme.
- **Confusion branding** : ne pas confondre branding **par tenant** (livré) et branding **plateforme** (dé-prioritisé). Documenter clairement.
- **Volume d'audit** : prévoir pagination + filtres serveur (un `AuditLog` peut être volumineux) ; index existants `[tenantId,createdAt]`/`[action,createdAt]` exploités.
- **Seed** : générer quelques entrées d'audit/demandes de démo réalistes sur l'environnement de démo (idempotent).

---

## 10. Critères d'acceptation T2d

- [ ] `audit/`, `demo/`, `page.tsx`, `analytics/` **sans tableaux codés en dur** ; alimentés par de vraies API cross-tenant ; états loading/empty/error+retry.
- [ ] API de **lecture** `AuditLog` (filtres + pagination) + endpoints overview/analytics, tous `@Roles(SUPER_ADMIN)`.
- [ ] Page `demo/` branchée sur le module `demo-requests` existant (statuts persistés).
- [ ] Accès cross-tenant **uniquement** via le `skipTenantFilter` SUPER_ADMIN existant ; **aucun** nouveau mécanisme d'isolation ; test « non-SUPER_ADMIN refusé » vert ; test d'isolation global toujours vert.
- [ ] Métriques non dérivables (MRR/plan) affichées « à venir », **jamais** inventées.
- [ ] Branding plateforme retiré/clarifié (per-tenant inchangé).
- [ ] `type-check` local vert ; CI verte → merge auto par PR ; **aucune migration** (sinon 🛑 validé), aucune modif CI/`package.json` racine.

---

## 11. Suite

Après validation : `superpowers:writing-plans` pour le plan détaillé T2d (Vague 1 audit+demo, puis Vague 2 overview+analytics). La Vague 3 (migration MRR/plan + branding plateforme) fera l'objet d'une décision séparée. T2b et T2c ont leurs specs dédiés.
