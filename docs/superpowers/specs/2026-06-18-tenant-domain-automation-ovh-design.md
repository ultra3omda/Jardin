# Design — Provisioning DNS automatique par tenant (OVH + Vercel)

- **Date** : 2026-06-18
- **Statut** : Approuvé (direction validée par l'utilisateur 2026-06-18 — relire avant `writing-plans`)
- **Auteur** : Claude Code + ultra3omda
- **Approche retenue** : **CNAME individuel par tenant** créé via l'API REST OVH au moment de la création
  (PAS de wildcard `*.klasso.tn`), domaine ajouté au projet Vercel par API, SSL auto, invite envoyée
  une fois le domaine actif.
- **Spécifications liées** :
  - `docs/superpowers/specs/2026-05-29-subdomain-per-tenant-design.md` (code web sous-domaine — dormant, activé ici)
  - `docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md` (white-label `Tenant.brand`)
  - `docs/superpowers/plans/2026-05-22-v11-dns-domain-actions.md` (ancien plan manuel/wildcard — superseded ici pour le per-tenant)
  - `docs/adr/0007-*` (blocage DNS wildcard `.tn` / email OVH)

---

## 0. TL;DR

À la création d'une école (`POST /admin/tenants`), lui attribuer automatiquement
`https://<slug>.klasso.tn` : **création d'un CNAME individuel via l'API OVH** (`<slug> → cname.vercel-dns.com`),
**ajout du domaine au projet Vercel** par API, **SSL Let's Encrypt auto**, puis **envoi de l'invitation
une fois le domaine actif** avec un lien vers l'URL brandée du tenant. Le tenant teste immédiatement
son application personnalisée (white-label `Tenant.brand`, déjà en place).

**Insight clé** : le blocage historique (ADR 0007 / D25) concerne **uniquement le wildcard**
`*.klasso.tn` (Vercel exigerait de basculer les nameservers chez Vercel → casse l'email OVH). Un
**CNAME individuel par tenant** ne touche pas les nameservers (la zone reste chez OVH, email intact)
et Vercel valide un sous-domaine individuel sur DNS externe via un simple CNAME. **Le per-tenant
contourne donc le blocage.**

Exécution **asynchrone** avec **suivi d'état en base** (`Tenant.domainStatus`). Tout est **gated par un
flag** (`ENABLE_TENANT_DOMAIN_AUTOMATION`) : flag off ⇒ comportement actuel identique (invite path-based
immédiate) → merge sans risque. **Zéro nouvelle dépendance** (fetch natif Node 20 + signature OVH faite main).

---

## 1. Contexte & problème

### 1.1 État actuel (vérifié)
- `TenantsService.create()` (`apps/api/src/admin/tenants.service.ts:55`) : crée tenant + admin user
  (placeholder password) + invite token + **envoie l'email Resend immédiatement** avec
  `registerUrl = invite.url` (path-based `/t/<slug>/register?token=…`). **Aucune action DNS.**
- Le code web sous-domaine (middleware sélectif, branding pré-auth `/t/[slug]/*`, helper
  `extractTenantSlugFromHost`) est **écrit mais dormant** (flags `ENABLE_SUBDOMAIN_RESOLVER` /
  `NEXT_PUBLIC_BASE_DOMAIN` non définis en prod).
- Le CORS API (`apps/api/src/common/config/configuration.ts`) est une **allowlist statique** sans
  `*.klasso.tn` ; le CSP web pointe vers un host API périmé.
- `Tenant.brand` (JSON logo/couleurs) = « l'appli personnalisée » → déjà en place et injecté post-auth +
  pré-auth via `getTenantBrand(slug)`.
- `Tenant` **n'a aucun champ** lié au domaine (`schema.prisma`).

### 1.2 Contraintes techniques relevées
- **Dépendances API** : `@nestjs/schedule`, `axios`, `ovh`, `@ovhcloud/node-ovh`, `undici` **non installés**.
  → on reste **zéro dépendance** : `fetch` natif (Node ≥ 20) + signature OVH faite main (~15 lignes,
  `node:crypto` SHA1). Conforme à la règle « pas de dép pour un besoin codable en 20 lignes ».
- **Config** : `configuration.ts` renvoie un objet imbriqué lu depuis `process.env`. On y ajoute un
  bloc `domainAutomation`.
- **Build/tests natifs cassés en local Windows** (`ERR_DLOPEN_FAILED`) : valider `type-check` + `lint`
  en local, suite complète (vitest/build) en CI.
- **Acquis OVH (utilisateur, 2026-06-18)** : `klasso.tn` actif chez OVH, zone DNS éditable, credentials
  API OVH disponibles (ou créables) avec droits `/domain/zone`.

### 1.3 Décision structurante préservée
- **Isolation = JWT `tenantId`, source UNIQUE** (invariant D3 de la spec sous-domaine). Le sous-domaine
  reste **cosmétique** (branding + redirection). Aucune décision d'autorisation ne lit le `Host`.

---

## 2. Décisions

| # | Décision | Justification |
|---|----------|---------------|
| **DA1** | **CNAME individuel par tenant** via API OVH, **pas de wildcard**. | Contourne ADR 0007 (pas de bascule nameservers → email OVH intact) ; Vercel valide un sous-domaine individuel sur DNS externe. |
| **DA2** | **Exécution asynchrone** + suivi d'état en base ; réponse HTTP immédiate. | Le SSL Vercel prend ~30 s à quelques minutes ; bloquer la réponse = timeout/UX dégradée. |
| **DA3** | **Migration Prisma additive** : `domainStatus` enum + `customDomain` + `domainError` + `domainProvisionedAt` sur `Tenant`. | Source de vérité fiable pour l'UI admin et l'envoi d'email conditionné. Backward-compat (`default NONE`). |
| **DA4** | **Email envoyé une fois `domainStatus = ACTIVE`**, lien vers `https://<slug>.klasso.tn/register?token=…`. Fallback path-based si `FAILED`. | Le tenant ne tombe jamais sur un lien mort ; il teste direct son URL brandée. |
| **DA5** | **Zéro dépendance** : clients OVH + Vercel faits main (fetch + `node:crypto`). | YAGNI + règle « pas de dép pour 20 lignes ». La signature OVH est triviale et testable. |
| **DA6** | **Mécanisme async = poller en arrière-plan borné + réconciliation `OnApplicationBootstrap` + retry admin.** Pas de queue ni de cron-lib. | Évite d'ajouter `@nestjs/schedule`/BullMQ. Robuste aux restarts via la passe de boot. |
| **DA7** | **Tout gated par `ENABLE_TENANT_DOMAIN_AUTOMATION`.** Flag off ⇒ flux actuel inchangé. | Merge dormant sans risque, activation contrôlée en prod. |
| **DA8** | **Inclure l'activation du code web sous-domaine** (CORS regex + CSP + flags middleware) dans ce lot. | Sans ça, le DNS+SSL seraient prêts mais l'app brandée ne s'afficherait pas sur le sous-domaine → démo « teste avec ton domaine » incomplète. |
| **DA9** | **Garde-fou code** : ne créer/supprimer QUE des records `CNAME` dont `subDomain` == slug validé ; **jamais** MX/TXT/apex/`@`. + `RESERVED_SLUGS` étendu aux noms email. | La clé OVH peut techniquement gérer toute la zone (email inclus). Défense en profondeur. |

---

## 3. Hors-périmètre (non-objectifs)

- ❌ Wildcard `*.klasso.tn` (on fait du per-tenant).
- ❌ Domaines custom arbitraires du tenant (`monecole.com`) — V11+.
- ❌ Builds mobiles par école (D1 verrouillé : 1 binaire multi-persona).
- ❌ Changement du modèle d'isolation (Prisma extension + JWT inchangés).
- ❌ Migration de l'email OVH vers un autre provider.
- ❌ Renommage de slug d'un tenant existant (slug immuable ; un changement impliquerait deprovision+reprovision, hors lot).

---

## 4. Architecture & flux

```
POST /admin/tenants  (SUPER_ADMIN)
  │  flag ENABLE_TENANT_DOMAIN_AUTOMATION = true
  ├─ tx: crée Tenant (domainStatus=PROVISIONING, customDomain="<slug>.klasso.tn") + admin User
  ├─ crée invite token (PAS d'email encore)
  ├─ audit "admin.tenant.created"
  ├─ déclenche (détaché de la tx) DomainProvisioningService.provision(tenantId)
  └─ réponse immédiate { tenant, invite, domainStatus: "provisioning" }

DomainProvisioningService.provision(tenantId)        [arrière-plan]
  1. OVH  upsertCname(zone, slug, target)   → POST /domain/zone/klasso.tn/record {CNAME}
  2. OVH  refresh(zone)                       → POST /domain/zone/klasso.tn/refresh
  3. Vercel addDomain("<slug>.klasso.tn")    → POST /v10/projects/{id}/domains
  4. poll Vercel getDomainConfig(...)         → jusqu'à verified && !misconfigured (SSL prêt)
  5. domainStatus=ACTIVE, domainProvisionedAt=now ; audit "admin.tenant.domain_provisioned"
  6. envoie invite (registerUrl = https://<slug>.klasso.tn/register?token=…)
  ────
  échec OVH/Vercel  → domainStatus=FAILED, domainError=<message> ; audit "..._failed"
                      → fallback : envoie invite path-based /t/<slug>/register?token=…

Boot (OnApplicationBootstrap)
  └─ scan Tenant where domainStatus=PROVISIONING → relance le poll (idempotent)

POST /admin/tenants/:id/domain/retry  (SUPER_ADMIN)
  └─ relance provision() pour un tenant FAILED (ou backfill d'un tenant existant NONE)
```

Servir l'app brandée sur le sous-domaine (DA8) :
```
Navigateur → ecole.klasso.tn/login
  → Vercel sert l'app web (domaine individuel validé, SSL OK)
  → middleware web (ENABLE_SUBDOMAIN_RESOLVER) : rewrite sélectif pré-auth → /t/ecole/login (branding)
  → login → API (CORS accepte ecole.klasso.tn via regex) → JWT{tenantId} = seule isolation
  → /dashboard : passthrough (pas de rewrite), tenant résolu par le JWT
```

---

## 5. Conception détaillée

### 5.1 Interface `DnsProvider` (`apps/api/src/dns/dns-provider.interface.ts`)
```ts
export interface DnsCnameRecord { id: string; subDomain: string; target: string; ttl: number; }

export interface DnsProvider {
  findCname(subDomain: string): Promise<DnsCnameRecord | null>;
  upsertCname(subDomain: string, target: string, ttl?: number): Promise<DnsCnameRecord>;
  deleteCname(subDomain: string): Promise<void>;
}
```
Pattern repository : OVH aujourd'hui, Cloudflare possible demain sans toucher le service.

### 5.2 `OvhDnsClient` (`apps/api/src/dns/ovh-dns.client.ts`) — impl `DnsProvider`
- Base URL `https://eu.api.ovh.com/1.0`.
- **Signature** (par requête) : `X-Ovh-Signature = "$1$" + sha1Hex(appSecret + "+" + consumerKey + "+" + method + "+" + url + "+" + body + "+" + timestamp)`.
  Headers : `X-Ovh-Application`, `X-Ovh-Consumer`, `X-Ovh-Timestamp`, `X-Ovh-Signature`, `Content-Type: application/json`.
  Timestamp : `GET /auth/time` (ou `Date.now()/1000` si dérive acceptable — on lit l'heure serveur pour robustesse).
- **Endpoints** :
  - `findCname` → `GET /domain/zone/{zone}/record?fieldType=CNAME&subDomain={sub}` puis `GET .../record/{id}`.
  - `upsertCname` → si absent `POST /domain/zone/{zone}/record {fieldType:"CNAME", subDomain, target:"cname.vercel-dns.com.", ttl:60}` ; si présent et target identique → no-op ; sinon delete+create. **Toujours** suivi de `POST /domain/zone/{zone}/refresh`.
  - `deleteCname` → résout l'id puis `DELETE /domain/zone/{zone}/record/{id}` + refresh.
- **Garde-fou (DA9)** : refuse toute opération dont `subDomain` ne matche pas `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$` ou figure dans une **denylist** (`@`, `www`, `mail`, `mx`, `smtp`, `imap`, `autodiscover`, `autoconfig`, `_dmarc`, `_domainkey`, `ns1`, `ns2`). Lève une erreur explicite — jamais d'appel OVH.

### 5.3 `VercelDomainsClient` (`apps/api/src/dns/vercel-domains.client.ts`)
- Base URL `https://api.vercel.com`, `Authorization: Bearer ${VERCEL_TOKEN}`, query `?teamId=${VERCEL_TEAM_ID}`.
- `addDomain(name)` → `POST /v10/projects/{projectId}/domains {name}`. **409 « domain already exists »** = succès idempotent.
- `getDomainConfig(name)` → combine `GET /v9/projects/{projectId}/domains/{name}` (`verified`) et `GET /v6/domains/{name}/config` (`misconfigured`). « Prêt » = `verified === true && misconfigured === false`.
- `removeDomain(name)` → `DELETE /v9/projects/{projectId}/domains/{name}`. 404 = déjà absent = succès.

### 5.4 `DomainProvisioningService` (`apps/api/src/admin/domain-provisioning.service.ts`)
- `provision(tenantId)` : orchestration §4 (steps 1-6), met à jour `domainStatus`, déclenche l'email via `TenantsService`/`ResendService`, écrit l'audit. **Détaché de toute transaction** (cf. gotcha R1.1 RLS : pas de fire-and-forget dans la tx de requête).
- `pollUntilActive(name, tenantId)` : poll borné — intervalle 10 s, max ~30 min (`MAX_POLL_ATTEMPTS=180`), constantes nommées. Sur succès → ACTIVE + email ; sur dépassement → FAILED.
- `deprovision(tenantId)` : `removeDomain` Vercel + `deleteCname` OVH ; `domainStatus=NONE`. Appelé par l'action admin de suppression de domaine (pas automatiquement au soft-delete tenant, pour éviter les surprises).
- `reconcilePending()` : `OnApplicationBootstrap` → relance `pollUntilActive` pour les tenants `PROVISIONING`.
- Flag off ⇒ toutes les méthodes sont des **no-op** (et `TenantsService` garde le flux actuel).

### 5.5 `TenantsService.create()` — modifications
- Si flag on : `domainStatus=PROVISIONING`, `customDomain="<slug>.klasso.tn"`, **ne pas** envoyer l'invite ici ; appeler `domainProvisioning.provision(tenant.id)` (détaché). Renvoyer `domainStatus` dans la réponse.
- Si flag off : flux **inchangé** (invite path-based immédiate).
- `seedPersonas`, `list`, `getById`, `resendInvite` : `buildSummary` expose `domainStatus`/`customDomain` pour l'UI.

### 5.6 Migration Prisma (additive — checkpoint 🛑)
```prisma
enum DomainStatus { NONE PROVISIONING ACTIVE FAILED }

model Tenant {
  // … champs existants …
  domainStatus        DomainStatus @default(NONE)
  customDomain        String?
  domainError         String?
  domainProvisionedAt DateTime?
}
```
Pas de drop, défaut `NONE` (tenants existants inchangés). `Tenant` n'est **pas** tenant-scoped → aucun impact RLS/isolation ni `TENANT_SCOPED_MODELS`.

### 5.7 Config / env (`configuration.ts`)
```
ENABLE_TENANT_DOMAIN_AUTOMATION=true
OVH_APP_KEY=…  OVH_APP_SECRET=…  OVH_CONSUMER_KEY=…
OVH_API_BASE=https://eu.api.ovh.com/1.0
OVH_DNS_ZONE=klasso.tn
DOMAIN_CNAME_TARGET=cname.vercel-dns.com
VERCEL_TOKEN=…  VERCEL_PROJECT_ID=…  VERCEL_TEAM_ID=…
```
Secrets Railway uniquement, jamais loggés (redaction Pino). Validés au boot si le flag est on (fail-fast si manquants).

### 5.8 Activation web sous-domaine (DA8 — reprend la spec 2026-05-29)
- **API CORS** : remplacer l'allowlist statique par un callback acceptant l'allowlist **ou** le regex
  `^https:\/\/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.klasso\.tn$` (`isAllowedOrigin`), `credentials: true`.
- **CSP web** (`next.config.mjs`) : `connect-src` → retirer le host périmé, ajouter `https://api.klasso.tn`
  + `wss://api.klasso.tn`.
- **Middleware web** : activer le rewrite **sélectif** pré-auth (`BRANDED_PREAUTH_PREFIXES`), `/dashboard`
  passthrough ; env `ENABLE_SUBDOMAIN_RESOLVER=true`, `NEXT_PUBLIC_BASE_DOMAIN=klasso.tn`,
  `NEXT_PUBLIC_ENABLE_SUBDOMAIN=true`. (Code déjà décrit dans la spec 2026-05-29 §5.1-5.5.)

---

## 6. Sécurité & isolation

- **Invariant D3** : aucune lecture du `Host` pour l'autorisation. Test de régression R10 : `Host` spoofé
  `autre-tenant.klasso.tn` + JWT tenant A ⇒ 0 fuite B.
- **Clé OVH en moindre privilège** : consumer key restreinte aux routes
  `GET/POST/DELETE /domain/zone/klasso.tn/record*` + `POST /domain/zone/klasso.tn/refresh`
  (+ `GET /auth/time`). + garde-fou code (DA9) interdisant tout record non-CNAME ou hors slug.
- **CORS** : regex strict `^https://<label>.klasso.tn$` (pas de `http`, pas de sous-sous-domaine).
- **Secrets** : env only, redaction Pino, jamais dans la réponse API ni l'audit metadata.
- **Audit** : `admin.tenant.domain_provisioned` / `admin.tenant.domain_failed` /
  `admin.tenant.domain_deprovisioned` (tenantId, slug, durée, sans secret).
- **Rate limit** : l'endpoint `retry` passe par le Throttler global ; le poller respecte un intervalle fixe.

---

## 7. Plan de test complet

### 7.1 Unit (Vitest — `apps/api`)
- `ovh-dns.client` : signature SHA1 sur vecteur connu (appSecret/consumerKey/method/url/body/ts fixes) ;
  payload CNAME correct ; **garde-fou** : `upsertCname('mail', …)` / `('@', …)` / non-CNAME ⇒ throw,
  aucun appel réseau ; idempotence (target identique = no-op).
- `vercel-domains.client` : `verified/misconfigured` → readiness ; 409 add = succès ; 404 delete = succès.
- `domain-provisioning.service` : machine à états NONE→PROVISIONING→ACTIVE et →FAILED ; fallback email
  path-based sur FAILED ; flag off = no-op ; `reconcilePending` relance le poll.
- `reserved-slugs` : nouveaux slugs email (`mail`, `mx`, `autodiscover`, …) rejetés à la création tenant.
- `isAllowedOrigin` (web/api) : accepte `ecole.klasso.tn` + allowlist ; rejette `evil.com`,
  `http://ecole.klasso.tn`, `a.b.klasso.tn`.

### 7.2 Intégration / e2e API (`apps/api/test/*.e2e-spec.ts`, OVH+Vercel **mockés**)
- `POST /admin/tenants` (flag on) → tenant `PROVISIONING`, `upsertCname` + `refresh` + `addDomain`
  appelés, **0 email** tant que pas ACTIVE.
- Poll → ACTIVE → invite envoyée avec URL **sous-domaine** ; metadata audit `domain_provisioned`.
- Échec Vercel → FAILED + `domainError` + invite **path-based** (fallback) + audit `domain_failed`.
- `OnApplicationBootstrap` reconcilie un tenant laissé `PROVISIONING` (simulate restart).
- `POST /admin/tenants/:id/domain/retry` → relance et passe ACTIVE.
- Flag off → comportement **identique à aujourd'hui** (invite immédiate path-based, `domainStatus=NONE`).
- **Isolation R10 (critique)** : `Host: autre-tenant.klasso.tn` + JWT tenant A ⇒ 0 fuite B
  (renforce le test existant `multi-tenant-isolation.e2e-spec.ts`).

### 7.3 Unit web (Vitest)
- Middleware (matrice) : sous-domaine `/login` → rewrite `/t/{slug}/login` ; sous-domaine `/dashboard`
  → passthrough ; apex `/t/{slug}/login` → inchangé ; slug réservé → pas de rewrite.

### 7.4 Manuel / runbook (`docs/superpowers/runbooks/2026-06-18-tenant-domain-provisioning.md`)
1. Flag on en staging/prod, env OVH+Vercel renseignées.
2. Créer un tenant réel `test-dns` via `/admin/tenants`.
3. `dig +short test-dns.klasso.tn CNAME` → `cname.vercel-dns.com.`
4. `curl -sI https://test-dns.klasso.tn/login` → `HTTP/2 200` + cert SSL valide.
5. Vérifier email reçu : lien = `https://test-dns.klasso.tn/register?token=…`.
6. S'inscrire via le lien → login → `/dashboard` brandé (logo/couleurs du tenant).
7. Isolation : `https://demo-autre.klasso.tn/login` → branding de l'autre tenant, pas de fuite.
8. Deprovision via action admin → record OVH supprimé (`dig` ne résout plus) + domaine retiré de Vercel.

> ⚠️ Build/tests natifs cassés en local Windows (`ERR_DLOPEN_FAILED`) → local : `type-check` + `lint` ;
> suite complète (vitest/build) en CI.

### 7.5 Couverture cible
≥ 70 % sur le code applicatif (clients DNS, service de provisioning, garde-fous). UI admin (badge statut)
exclue du seuil (UI pure).

---

## 8. Découpage en PRs

| PR | Portée | Risque | Activable seul ? |
|----|--------|--------|------------------|
| **PR-1** | `DnsProvider` + `OvhDnsClient` + `VercelDomainsClient` + tests unit (aucun branchement au flux) | Faible | ✅ (briques pures testées) |
| **PR-2** | Migration Prisma `domainStatus` + `DomainProvisioningService` + reconciler boot + retry endpoint + branchement `TenantsService` + email ACTIVE/fallback + flag + e2e | Moyen | 🛑 schéma + zone tenant — **revue sécurité obligatoire** |
| **PR-3** | Activation web : CORS regex (`isAllowedOrigin`) + fix CSP + flags middleware sélectif + tests | Moyen | 🛑 multi-tenant — **revue sécurité obligatoire** |
| **UI** | Badge `domainStatus` + bouton « Provisionner / Réessayer » dans `/admin/tenants/[id]` (frontend-design) | Faible | ✅ (cosmétique, après PR-2) |

> Ordre : PR-1 → PR-2 → PR-3 → UI. PR-2 et PR-3 touchent la zone multi-tenant ⇒ checkpoint 🛑 + revue sécu.

---

## 9. Risques

| # | Risque | Mitigation |
|---|--------|-----------|
| R1 | Propagation `.tn` lente avant validation Vercel | TTL bas (60 s), poll borné ~30 min, retry admin, statut FAILED non bloquant |
| R2 | Clé OVH trop large (accès MX/email) | Consumer key restreinte par route + garde-fou code (CNAME slug only, denylist email) |
| R3 | Provisioning échoue après création tenant | Statut FAILED visible UI + **fallback invite path-based** ⇒ tenant jamais bloqué |
| R4 | Restart Railway pendant le poll | Réconciliation `OnApplicationBootstrap` |
| R5 | Quotas/limites API OVH ou Vercel | Idempotence (upsert/409/404 = succès), backoff sur erreurs transitoires, audit des échecs |
| R6 | Collision slug ↔ enregistrement critique (email) | `RESERVED_SLUGS` étendu + garde-fou denylist DA9 |
| R7 | Activation CORS/middleware casse l'apex ou les previews `*.vercel.app` | Regex strict `*.klasso.tn` ; previews ne matchent pas le base domain → path-mode `/t/<slug>` |

---

## 10. Critères d'acceptation

- Création d'un tenant (flag on) ⇒ `<slug>.klasso.tn` résout vers Vercel, SSL valide, en < 30 min.
- L'invite part **après** `ACTIVE`, lien vers le sous-domaine ; sur échec, fallback path-based automatique.
- UI admin affiche `domainStatus` (provisioning/active/failed) + action retry.
- Flag off ⇒ comportement strictement identique à aujourd'hui.
- Aucune régression d'isolation (test R10 vert) ; aucun record non-CNAME/hors-slug créé chez OVH.
- Couverture ≥ 70 % sur le code applicatif ; CI verte (lint + type + build + tests + e2e).
