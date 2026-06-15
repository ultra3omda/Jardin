# Design — Postgres RLS comme 2ᵉ couche d'isolation multi-tenant

> **Statut** : proposition (à valider avant tout code — chantier *checkpoint*, touche le cœur multi-tenant).
> **Date** : 2026-06-15.
> **Portée** : `apps/api` (Prisma + Neon Postgres 16). Aucun impact web/mobile (transparent).
> **Risque** : ÉLEVÉ. Une RLS mal configurée = panne totale (toutes requêtes bloquées) ou faux sentiment de sécurité. → rollout phasé, validé sur branche Neon, rollback prêt.

---

## 1. Contexte & objectif

L'isolation multi-tenant actuelle repose sur **une seule couche applicative** : l'extension Prisma `tenant-isolation` (`apps/api/src/common/prisma/tenant.extension.ts`), câblée comme **choke point unique** via le `Proxy` de `PrismaService` (le client injecté par tous les services EST le client gardé, y compris dans `$transaction`). Le `tenantId` vient du `TenantContextService` (AsyncLocalStorage). C'est solide et testé (`multi-tenant-isolation.e2e-spec.ts`, ~88 cas ; garde `tenant-scoped-models.spec.ts`).

**Mais c'est une défense à une seule couche.** Si cette couche est contournée, rien en dessous ne protège. RLS (Row-Level Security) ajoute une **2ᵉ couche, au niveau de la base** : même une requête qui échappe à l'extension ne peut pas franchir la frontière tenant. C'est de la **défense en profondeur** (risque R10 du registre).

**Objectif** : aucune ligne d'un tenant A ne peut être lue/écrite dans un contexte tenant B, **garanti par Postgres**, en complément (pas en remplacement) de l'extension applicative.

## 2. Les trous concrets que l'extension laisse (et que RLS ferme)

Constats tirés du code actuel (`tenant.extension.ts`) :

1. **`$queryRaw` / `$executeRaw` ne passent PAS par l'extension.** Les hooks `query.$allModels` ne couvrent que les opérations de modèle. Tout SQL brut est non scopé. → RLS le couvre.
2. **`findUnique` / `update` / `delete` (par clé unique) ne sont PAS auto-scopés** (commentaire explicite l.176-183 : « callers stay responsible »). Un `findUnique({ where: { id } })` sur un id deviné renvoie la ligne d'un autre tenant. → RLS le bloque.
3. **`create` / `createMany` / `upsert` n'injectent pas `tenantId`** (callers responsables). Un oubli ⇒ insert avec mauvais `tenantId` (ou null). → une policy `WITH CHECK` le rejette.
4. **Nouveau modèle oublié dans `TENANT_SCOPED_MODELS`** ⇒ silencieusement non scopé (seul le garde-fou de test le rattrape, *a posteriori*, en CI). → avec RLS activée sur la table, protégé par défaut.
5. **Bug dans le contexte AsyncLocalStorage** (perdu sur un `setTimeout`, un worker, une lib qui casse le contexte) ⇒ `getTenantId()` renvoie null ⇒ requête non scopée. → RLS exige une variable de session valide.

## 3. Le vrai défi technique : faire parvenir `tenant_id` à Postgres

Une policy RLS lit une variable de session : `current_setting('app.current_tenant', true)`. L'app doit la **poser avant chaque requête**, **par requête**, **sans fuite entre connexions**.

**Contrainte Neon (bloquante pour les approches naïves)** : le endpoint *pooled* de Neon est un **pgbouncer en mode transaction**. Une connexion est partagée *entre transactions* → un `SET` de session **fuit ou est perdu** d'une requête à l'autre. La seule primitive sûre est **`SET LOCAL` / `set_config(key, val, true)` à l'intérieur d'une transaction** : la variable est liée à la transaction et nettoyée à son terme, et la transaction « possède » sa connexion pooled le temps de son exécution.

Conséquence : **chaque opération applicative doit s'exécuter dans une transaction qui pose d'abord `app.current_tenant`.** C'est LE coût/la friction de RLS avec Prisma+Neon.

### Options évaluées

| Option | Idée | Verdict |
|---|---|---|
| **A. Extension Prisma `$allOperations` → wrap chaque op dans une tx + `set_config(...,true)`** | Réutilise le choke point existant ; chaque requête devient une mini-transaction de 2 statements. | ✅ **Recommandé.** Pattern documenté Prisma+RLS, compatible pooling transaction, zéro réécriture des services. Coût : +1 round-trip/req (atténuable). |
| B. Transaction par *requête HTTP* (ouverte dans `TenantContextInterceptor`), `tx` partagé via le contexte | 1 seule tx/req (moins d'overhead). | ❌ Réécriture massive : les services injectent `PrismaService`, pas un `tx` contextuel. Tx longues = connexions tenues. |
| C. Connexion par requête + `SET` session | — | ❌ Incompatible pooling transaction Neon. |
| D. Schéma/DB par tenant | Isolation physique. | ❌ Hors-échelle (60+ tables × N écoles), casse les requêtes plateforme. |

> **Note perf (Option A)** : les écritures sont déjà souvent transactionnelles ; les lectures gagnent une tx implicite. Sur Neon, ~+0.5–1 ms/req. Acceptable pour le volume actuel ; on peut exempter les hot-paths plus tard (lecture via une fonction `set` mutualisée, ou batcher).

## 4. Décisions de conception proposées

1. **Garder les DEUX couches.** L'extension reste la couche *correction + DX* (requêtes propres, erreurs lisibles, blocage COMMERCIAL, clamp `take`). RLS est le *filet de sécurité* DB. On ne supprime rien.
2. **Variable de session** : `app.current_tenant` (text = tenantId, `''` si absent) + `app.bypass_rls` (`'on'`/`'off'`).
3. **Pose de la variable** : extension Prisma `$allOperations` (Option A) qui lit `TenantContextService` et fait `set_config` en `LOCAL` dans la même tx que l'opération.
4. **Bypass SUPER_ADMIN** : quand `skipTenantFilter` est vrai (contexte SUPER_ADMIN), poser `app.bypass_rls='on'`. Les policies : `USING ( current_setting('app.bypass_rls', true) = 'on' OR tenant_id = current_setting('app.current_tenant', true) )`.
5. **Modèles plateforme-partagés** (`User`/`RefreshToken`/`AuditLog`, `tenantId` nullable) : policy qui autorise aussi les lignes `tenant_id IS NULL` (comptes COMMERCIAL/SUPER_ADMIN, sessions plateforme, audit plateforme).
6. **Exceptions** (`Contract`, `InviteToken`) : **pas de RLS** (gérés par les rôles plateforme, `InviteToken` consommé sans contexte au register). À acter explicitement (comme `TENANT_SCOPED_EXCEPTIONS`).
7. **`FORCE ROW LEVEL SECURITY`** : l'app se connecte vraisemblablement en *owner* des tables sur Neon ; sans `FORCE`, l'owner contourne RLS. On force → **mais alors migrations + seed + jobs système (sans contexte) sont aussi filtrés** → ils doivent poser `app.bypass_rls='on'` (cf. §5).
8. **Couverture = `TENANT_SCOPED_MODELS`** (les 60 modèles listés). Ajouter un **garde-fou de test** « toute table avec `tenant_id` a une policy RLS active » (miroir de `tenant-scoped-models.spec.ts`).
9. **Les policies vivent dans les migrations SQL** (hand-authored). Elles ne sont pas dans `schema.prisma` ; `prisma migrate dev` ne les gère pas (pas de drift). Documenté.

## 5. Points opérationnels critiques (sources de panne)

- **`prisma migrate deploy` (boot Railway)** s'exécute hors contexte tenant. Avec `FORCE RLS`, les migrations de *données* (backfills) seraient filtrées. → la connexion de migration doit bypasser : soit rôle dédié `BYPASSRLS`, soit `SET app.bypass_rls='on'` en tête de session de migration. **À résoudre avant d'activer FORCE.**
- **`seed.ts`** (re-seed démo) écrit sans contexte tenant → idem, doit bypasser.
- **Rôle de connexion Neon** : décider entre (a) garder l'owner + `FORCE` + bypass explicite pour migrations/seed, ou (b) créer un rôle applicatif non-owner (RLS s'applique sans `FORCE`) + garder l'owner pour les migrations. **(b) est plus propre** mais demande de gérer 2 rôles/URLs (`DATABASE_URL` applicatif + `DIRECT_URL`/migration owner).
- **`directUrl`** : probablement nécessaire (migrations sur endpoint direct, runtime sur endpoint pooled). À ajouter au `datasource`.
- **Observabilité** : une RLS qui bloque renvoie « 0 ligne » (lecture) ou une erreur insert opaque → prévoir un log clair côté extension quand `app.current_tenant` est vide hors bypass.

## 6. Risques & mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| RLS activée sans variable posée partout | Panne (0 ligne / erreurs) | Phase 1 pose la variable AVANT d'activer RLS ; soak en staging. |
| Migrations/seed filtrés par FORCE | Boot/seed cassés | Bypass explicite migration/seed (§5) testé sur branche Neon d'abord. |
| Overhead tx par requête | Latence | Mesuré en Phase 0 ; exemptions hot-path si besoin. |
| Nouveau modèle sans policy | Trou silencieux | Garde-fou de test RLS en CI. |
| Rollback nécessaire | — | Migration `DISABLE/DROP POLICY` prête ; les 2 couches → désactiver RLS laisse l'extension active (pas de régression sécurité immédiate). |

## 7. Alternatives écartées

- **Statu quo (extension seule)** : rejeté — objectif = défense en profondeur.
- **DB/schéma par tenant** : rejeté — hors échelle, casse les requêtes plateforme/analytics.
- **RLS sans l'extension** : rejeté — on perdrait DX, messages d'erreur, blocage COMMERCIAL, clamp `take`.

## 8. Décisions qui requièrent ta validation (avant le plan d'exécution)

1. **Rôle de connexion** : (a) owner + `FORCE` + bypass migrations, ou (b) rôle applicatif non-owner + owner pour migrations (recommandé (b), + `directUrl`) ?
2. **Coût perf** : on accepte +1 tx/requête (Option A) pour démarrer ?
3. **Périmètre du 1er jet** : pilote sur 2-3 tables (ex. `Student`, `Grade`) pour valider la chaîne de bout en bout, puis généralisation — ou tout d'un coup ?
4. **Priorité/fenêtre** : ce n'est pas urgent (l'extension isole déjà) ; c'est ~2-4 j d'effort avec soak. On le programme quand ?

> Le plan d'exécution détaillé (phases, migrations, tests, rollout) est dans
> [`docs/superpowers/plans/2026-06-15-postgres-rls-implementation.md`](../plans/2026-06-15-postgres-rls-implementation.md).
