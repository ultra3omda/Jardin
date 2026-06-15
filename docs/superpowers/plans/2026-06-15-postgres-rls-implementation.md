# Plan d'exécution — Postgres RLS (2ᵉ couche d'isolation)

> Design & décisions : [`specs/2026-06-15-postgres-rls-tenant-isolation.md`](../specs/2026-06-15-postgres-rls-tenant-isolation.md).
> **Pré-requis** : valider les 4 décisions ouvertes (§8 de la spec) — surtout le **rôle de connexion** et le périmètre du 1er jet.
> **Principe** : phasé, réversible, validé sur **branche Neon** avant `main`. On pose la plomberie AVANT d'activer RLS. Les deux couches coexistent : à tout moment, désactiver RLS laisse l'extension applicative active (pas de régression sécurité).

Effort estimé : **~2-4 j** (dont soak staging). Chaque phase = 1 PR mergeable et réversible.

---

## Phase 0 — Spike de validation

> **✅ Partie « correction des policies » faite en CI** (`apps/api/test/rls-policy.e2e-spec.ts`)
> au lieu d'une branche Neon manuelle : prouve, sur Postgres 16, que le pattern de
> policy (USING/WITH CHECK + bypass + variable vide = *fail-closed* + clause
> `tenant_id IS NULL` pour les modèles plateforme-partagés) bloque réellement le
> cross-tenant — via `SET LOCAL ROLE` vers un rôle non-superuser + `set_config(...,true)`.
> **Reste à faire sur vraie Neon** (besoin de ton environnement) : valider que
> `set_config` LOCAL survit dans une tx du *pooler* pgbouncer, et mesurer l'overhead
> « tx 2-statements » — ces points ne sont pas reproductibles sur le Postgres simple de la CI.

But : prouver la chaîne de bout en bout et mesurer le coût, sans rien risquer.

- [ ] Créer une **branche Neon** (copie de prod) pour expérimenter.
- [ ] Sur une seule table (`students`) : `ENABLE ROW LEVEL SECURITY` + `FORCE` + policy `USING/WITH CHECK (tenant_id = current_setting('app.current_tenant', true))`.
- [ ] Manuellement (psql) : vérifier qu'une tx qui pose `set_config('app.current_tenant','A',true)` ne voit que les élèves de A ; sans variable → 0 ligne ; insert d'un `tenant_id` ≠ var → rejet `WITH CHECK`.
- [ ] Vérifier le comportement **owner vs FORCE** (confirmer la décision rôle) et le comportement **pooled endpoint** (set_config local survit dans la tx, est nettoyé après).
- [ ] Mesurer l'overhead « tx 2-statements » vs requête simple.
- **Sortie** : note de résultats + décision rôle confirmée. Si un point bloque → on réajuste la spec avant Phase 1.

## Phase 1 — Plomberie « set_config » SANS activer RLS (1 PR)

But : poser `app.current_tenant` / `app.bypass_rls` sur **chaque** requête, et le prouver, alors que RLS est encore OFF (donc zéro risque de panne).

- [ ] **Extension `rls-session`** (`apps/api/src/common/prisma/rls.extension.ts`) via `$allOperations` :
  - lit `TenantContextService` ;
  - exécute l'op dans une tx qui fait d'abord `SELECT set_config('app.current_tenant', $tenant, true)` et `set_config('app.bypass_rls', $bypass, true)` ;
  - `bypass='on'` si `shouldSkipTenantFilter()` (SUPER_ADMIN) ou hors contexte (système) — **tant que RLS est OFF, le bypass est sans effet** ; on affinera le « hors contexte » en Phase 4.
  - se compose APRÈS l'extension `tenant-isolation` existante dans `PrismaService` (`$extends(...).$extends(...)`).
- [ ] Gérer le cas `$transaction` interactif (déjà lié au client gardé) : la pose de variable doit s'appliquer dans la tx ouverte par l'app aussi (option : un helper `withTenantTx`). À détailler selon le résultat Phase 0.
- [ ] **Connexion migrations/seed** : ajouter `directUrl` au `datasource` + s'assurer que `migrate deploy` et `seed.ts` posent `app.bypass_rls='on'` (ou tournent via le rôle owner/BYPASSRLS selon décision §8.1).
- [ ] Tests : unit extension (la variable est posée avec la bonne valeur selon contexte/bypass) ; e2e de non-régression (rien ne change fonctionnellement, RLS OFF).
- **Sortie** : prod tourne avec la variable posée partout, RLS toujours OFF. Observable (log si `app.current_tenant` vide hors bypass).

## Phase 2 — Activation pilote (1 PR, 2-3 tables)

But : activer RLS sur un petit périmètre représentatif et valider en conditions réelles.

- [ ] Migration `…_rls_pilot` : `ENABLE` + `FORCE` + policies sur `students`, `grades`, `attendances` (1 leaf, 1 cross-référencée, 1 à fort volume).
  - Policy standard : `CREATE POLICY tenant_isolation ON "students" USING (...) WITH CHECK (...)` (cf. modèle §3).
- [ ] e2e dédié : un `$queryRaw` cross-tenant → 0 ligne ; un `findUnique` d'un id d'un autre tenant → null ; un insert mauvais `tenant_id` → erreur.
- [ ] Vérifier SUPER_ADMIN (bypass) + COMMERCIAL (déjà bloqué par l'extension, RLS ne doit pas casser ses lectures plateforme).
- [ ] Soak en staging (branche Neon) 24-48 h, surveiller erreurs/latence.
- **Sortie** : modèle de policy validé sur du vrai trafic.

## Phase 3 — Généralisation (1 PR)

- [ ] Migration `…_rls_all` : policies sur **tous** les `TENANT_SCOPED_MODELS` restants.
  - Modèles plateforme-partagés (`users`, `refresh_tokens`, `audit_logs`) : policy avec `OR tenant_id IS NULL`.
  - `contracts`, `invite_tokens` : **pas de RLS** (documenté, comme les exceptions de l'extension).
- [ ] **Garde-fou CI** `rls-coverage.spec.ts` : toute table avec colonne `tenant_id` ∈ `TENANT_SCOPED_MODELS` doit avoir `relrowsecurity = true` + une policy (sinon CI rouge). Miroir de `tenant-scoped-models.spec.ts`.
- [ ] Étendre `multi-tenant-isolation.e2e-spec.ts` : pour chaque modèle, au moins un cas « accès cross-tenant via chemin brut → bloqué par RLS ».
- **Sortie** : RLS active sur tout le périmètre tenant.

## Phase 4 — Durcissement « contexte manquant » (1 PR)

- [ ] Politique stricte du bypass : `app.bypass_rls='on'` **uniquement** pour SUPER_ADMIN et les jobs système explicitement déclarés (seed, migrations, fan-out notifications). Tout autre contexte sans `app.current_tenant` ⇒ **pas de bypass** ⇒ RLS bloque (fail-closed) au lieu de fuiter.
- [ ] Auditer les chemins « hors contexte » légitimes (login lookups, refresh, demo-login self-heal, exports, notifications fan-out) et leur donner soit un contexte, soit un bypass explicite tracé.
- **Sortie** : un bug de contexte AsyncLocalStorage = 0 ligne (sûr), pas une fuite.

## Phase 5 — Doc, ADR, rollout prod

- [ ] **ADR** `docs/adr/00XX-postgres-rls.md` (décision, rôle de connexion, bypass, coexistence avec l'extension).
- [ ] Mettre à jour `CLAUDE.md` (section multi-tenant : « 2 couches — extension + RLS ») et le registre de risques (R10).
- [ ] Runbook `docs/operations/rls.md` : comment ajouter une table (policy + garde-fou), comment debugger un « 0 ligne », **migration de rollback prête** (`ALTER TABLE … DISABLE ROW LEVEL SECURITY` / `DROP POLICY`).
- [ ] Rollout prod (Railway/Neon) hors heures de pointe, surveillance Sentry + latence ; rollback en 1 migration si besoin.

---

## Modèle de migration (référence)

```sql
-- Par table tenant-scoped :
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "students" FORCE  ROW LEVEL SECURITY;          -- si app = owner (décision §8.1)
CREATE POLICY tenant_isolation ON "students"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = current_setting('app.current_tenant', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR tenant_id = current_setting('app.current_tenant', true)
  );

-- Modèle plateforme-partagé (users/refresh_tokens/audit_logs) : ajouter `OR tenant_id IS NULL`.
-- Rollback : DROP POLICY tenant_isolation ON "students"; ALTER TABLE "students" DISABLE ROW LEVEL SECURITY;
```

## Esquisse de l'extension `rls-session` (référence, Phase 1)

```ts
// $allOperations : enveloppe chaque op dans une tx qui pose la variable LOCAL.
Prisma.defineExtension({
  name: 'rls-session',
  query: {
    async $allOperations({ args, query }) {
      const ctx = tenantContext.get();
      const tenant = ctx?.tenantId ?? '';
      const bypass = (!ctx || ctx.skipTenantFilter) ? 'on' : 'off'; // affiné en Phase 4
      // NB : si déjà dans une tx interactive, ne pas en rouvrir une (détecter via un flag de contexte).
      return prismaRaw.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenant}, true),
                                    set_config('app.bypass_rls', ${bypass}, true)`;
        return query(args); // exécuté dans la même tx/connexion pooled
      });
    },
  },
});
```
> ⚠️ Le point délicat est l'interaction avec les `$transaction` déjà ouverts par les services (ne pas imbriquer/rouvrir). À régler proprement en Phase 1 selon le résultat du spike Phase 0.

## Définition de « terminé »

- RLS `ENABLE+FORCE` + policy sur 100 % des `TENANT_SCOPED_MODELS` ; garde-fou CI vert.
- e2e : tout accès cross-tenant par chemin brut (`$queryRaw`, `findUnique` by id, insert mauvais tenant) **bloqué par la DB**.
- SUPER_ADMIN cross-tenant et COMMERCIAL plateforme inchangés.
- Migrations/seed/jobs système fonctionnels (bypass maîtrisé).
- ADR + runbook + rollback documentés. Soak staging OK, latence acceptable.
