# 0015 — T2d : console Admin SaaS sur données réelles (sans migration)

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** User

## Context

Les pages `/admin/*` (overview, analytics, audit, demo-requests, branding)
existaient en coquilles ou sur données fictives. T2d les branche sur des données
**réelles et persistantes** pour le rôle `SUPER_ADMIN`, sans introduire la
moindre migration Prisma : on ne s'appuie que sur des modèles déjà présents
(`Tenant`, `User`, `Student`, `AuditLog`). La facturation par abonnement
n'existe pas encore, donc aucun chiffre de revenu n'est inventé.

Contrainte d'isolation non négociable : la portée tenant/rôle dérive
**uniquement du JWT**, jamais du Host / Origin / sous-domaine.

## Decision

### Lecture du journal d'audit — accès direct

`GET /api/admin/audit` lit la table `AuditLog` existante avec filtres optionnels
(action, resource, tenantId, userId, plage `from`/`to` ISO-8601) et pagination
(`page`, `pageSize`). Aucun nouveau modèle. `AuditQueryDto` a tous ses champs
optionnels — un GET nu ne renvoie jamais 400.

### Demandes de démo — statut event-sourced dans `AuditLog`

Pas de table `DemoRequest`. Une demande = une ligne `AuditLog`
`action='demo.requested'` (metadata `{requestId,email,schoolName,studentsCount,locale}`).
Un changement de statut = une ligne `action='demo.status_changed'`
(metadata `{requestId,status,note?}`, `userId` = super-admin). Le statut courant
d'une demande est la **dernière** ligne `demo.status_changed` pour ce `requestId`
(défaut `NEW`). La dérivation est une fonction pure `deriveDemoRequests(requested, statuses)`
qui exige des lignes de statut triées `createdAt DESC` (première vue par requestId = la plus récente).

Rejeté — créer une table `DemoRequest` dédiée : imposerait une migration alors
que le volume est faible et que l'historique d'audit suffit. L'event-sourcing
donne gratuitement la traçabilité (qui a changé quoi, quand).

### Overview & Analytics — agrégations en mémoire

`GET /api/admin/overview` renvoie des `count()` (`Tenant`, `User`, `Student`,
tous filtrés `deletedAt: null`) plus le nombre de demandes de démo en attente.
`GET /api/admin/analytics` agrège des `select` légers (croissance mensuelle des
tenants, répartition par type / locale / rôle). Tout est calculé à la volée, pas
de table matérialisée.

### Requêtes bornées — `MAX_DEMO_AUDIT_ROWS`

Les lectures de démo (overview + liste admin) scannaient toute la table
`AuditLog`. On plafonne désormais chaque `findMany` de démo à
`MAX_DEMO_AUDIT_ROWS = 5000` lignes, triées `createdAt DESC`, pour garder
l'agrégation en mémoire bornée (règle « unbounded queries → add constraints »).

### Revenu (MRR / ARR / churn / ARPU) — reporté « À venir »

La facturation par abonnement n'étant pas branchée, aucun chiffre de revenu
n'est affiché. Les emplacements MRR du dashboard et le bloc revenu de la page
analytique affichent un placeholder honnête « À venir », jamais une valeur
inventée.

### Isolation — JWT uniquement

Toutes les routes `/api/admin/*` sont gardées par `@Roles(UserRole.SUPER_ADMIN)`.
Le `RolesGuard` global (APP_GUARD) renvoie 403 avant d'atteindre le service pour
tout autre rôle. `TenantContextInterceptor` positionne
`skipTenantFilter = (role === SUPER_ADMIN)`, et l'extension Prisma injecte
`where.tenantId` pour tous les autres rôles. Le SUPER_ADMIN n'a pas de
`tenantId` (lectures cross-tenant volontaires et délibérément gardées).

## Consequences

**Positive :**
- Zéro migration : aucun risque sur les données existantes.
- Demandes de démo fonctionnelles de bout en bout, avec persistance réelle du
  statut et historique d'audit gratuit.
- Pages admin sur données réelles, placeholders « À venir » honnêtes là où la
  donnée n'existe pas encore (revenu).
- Matrice RBAC vérifiée par e2e (SUPER_ADMIN 200 / SCHOOL_ADMIN 403 sur chaque
  route, plus le round-trip de persistance du statut de démo).

**Negative :**
- L'event-sourcing du statut de démo via `AuditLog` mélange données métier et
  journal d'audit ; si le volume de démos explose, une table dédiée + migration
  deviendra préférable (le cap `MAX_DEMO_AUDIT_ROWS` est un garde-fou, pas une
  pagination complète).
- Aucun indicateur de revenu tant que les abonnements ne sont pas branchés.
- Les agrégations analytics sont recalculées à chaque requête (acceptable au
  volume actuel ; cache Redis envisageable plus tard).

## Out-of-scope (lots ultérieurs)

- Facturation par abonnement + métriques de revenu réelles (MRR/ARR/churn/ARPU).
- Table `DemoRequest` dédiée + migration (si le volume le justifie).
- Cache Redis sur overview / analytics.
- Personnalisation d'apparence globale de la plateforme (page branding reste un
  placeholder honnête).
- Auto-vérification e-mail des comptes seedés en login régulier (pré-existant,
  hors T2d — voir note de suivi).

## References

- Backend: `apps/api/src/admin/` (audit, platform-analytics), `apps/api/src/demo-requests/`
- Dérivation statut: `apps/api/src/demo-requests/demo-status.util.ts` (`deriveDemoRequests`, `MAX_DEMO_AUDIT_ROWS`)
- Seed: `apps/api/prisma/seed.ts` (`seedDemoRequests`, idempotent)
- E2E: `apps/api/test/admin-platform.e2e-spec.ts`
- Frontend: `apps/web/app/[locale]/(app)/admin/` (page, analytics, audit, demo, branding)
- Plan: `docs/superpowers/plans/2026-05-30-t2d-saas-admin.md`
