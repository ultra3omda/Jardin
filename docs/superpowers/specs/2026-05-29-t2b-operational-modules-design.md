# T2b — Modules opérationnels (cantine, transport, santé, sécurité, discipline, journal, activités) — Design

> **Statut :** Validé par l'utilisateur (2026-05-30). Plan à produire après T2d.
> **Date :** 2026-05-29
> **Track :** Track 2 (capacités opérationnelles), sous-projet **T2b**.
> **Références :** `docs/superpowers/specs/2026-05-29-school-admin-crud-remediation-design.md` (T2a — pattern CRUD MVP que T2b réutilise).

---

## 1. Objectif

Doter d'un **backend réel** les 7 modules opérationnels aujourd'hui **100 % démo front-end** (tableaux codés en dur, aucune persistance) : **cantine, transport, santé, sécurité, discipline, journal (cahier de liaison), activités**.

Contrairement à T2a (qui câble des backends existants), **T2b crée les modèles Prisma manquants** + modules NestJS + proxys web + UI CRUD, en **réutilisant le pattern CRUD MVP figé par T2a** (`useResource`, `<ResourceListPage>`, `<CrudModal>`, états loading/empty/error+retry, plus aucun fallback démo).

En une phrase : *un SCHOOL_ADMIN doit pouvoir gérer menus de cantine, lignes de transport, dossiers de santé, événements de sécurité, incidents de discipline, entrées de journal et activités — avec persistance réelle, sur des modèles créés pour l'occasion.*

---

## 2. Constat (état actuel, factuel)

### 2.1 Zéro backend sur les 7 domaines
Audit confirmé : **aucun modèle Prisma, aucun module NestJS, aucun proxy web** pour ces domaines.

| Domaine | Page web | Tableau démo codé en dur |
|---|---|---|
| Cantine | `apps/web/app/[locale]/(app)/canteen/page.tsx` | `WEEKLY_MENU`, `STATS` |
| Transport | `…/(app)/transport/page.tsx` | `BUS_ROUTES` |
| Santé | `…/(app)/health/page.tsx` | `HEALTH_NOTES` |
| Sécurité | `…/(app)/security/page.tsx` | `SECURITY_EVENTS` |
| Discipline | `…/(app)/discipline/page.tsx` | `INCIDENTS` |
| Journal | `…/(app)/journal/page.tsx` | `JOURNAL_ENTRIES` |
| Activités | `…/(app)/activities/page.tsx` | `ACTIVITIES` |

> ⚠️ Le module `apps/api/src/health/` existant est un **healthcheck HTTP** (`/health`), **sans rapport** avec la santé scolaire — ne pas le confondre. Le module santé scolaire sera nommé pour éviter la collision (`student-health` ou route `/health-records`).

### 2.2 Le problème central
Aucune donnée n'est persistée : tout est figé dans le composant. La remédiation impose de **créer le socle de données** (modèles + migrations) puis de brancher web (et mobile selon valeur d'usage) dessus.

---

## 3. Décisions verrouillées (entrées de ce design)

| Décision | Choix retenu |
|---|---|
| **Migrations Prisma** | **REQUISES** (nouveaux modèles). Chaque migration déclenche le **🛑 checkpoint CLAUDE.md** → validation utilisateur explicite avant `prisma migrate`. |
| **Pattern CRUD** | **Réutilise le pattern MVP de T2a** (web : `useResource`/`<ResourceListPage>`/`<CrudModal>` ; états explicites ; pas de fallback démo). |
| **Découpage** | **Tranches verticales par domaine** (modèle → migration → module NestJS → proxy → web → tests), 1 PR par domaine (ou petit groupe). |
| **Surfaces** | **Web prioritaire et complet** pour les 7 domaines. **Mobile** ciblé selon valeur d'usage (voir §5.4), pas systématique. |
| **Isolation** | Inchangée : `tenantId` + index `@@index([tenantId, …])` sur chaque modèle ; scoping via l'extension Prisma globale existante. Aucun nouveau mécanisme. |

---

## 4. Périmètre

### 4.1 Modèles Prisma proposés (MVP — formes indicatives, colonnes finalisées en `writing-plans`)

Tous les modèles sont **tenant-scoped** (`tenantId` + index) et soft-delete (`deletedAt`) quand pertinent.

| # | Domaine | Modèle(s) MVP | Champs clés |
|---|---|---|---|
| 1 | **Cantine** | `CanteenMenu` | `weekStart`, `dayOfWeek` (enum), `starter`, `main`, `dessert`, `allergens` |
| 2 | **Transport** | `TransportRoute` (+ `TransportStop`) | route : `name`, `driverName`, `vehicleInfo`, `capacity` · stop : `routeId`, `label`, `time`, `order` |
| 3 | **Santé** | `StudentHealthRecord` (+ `HealthVisit`) | record : `studentId`, `bloodType`, `allergies`, `chronicConditions`, `doctor`, `notes` · visit : `studentId`, `date`, `reason`, `treatment` |
| 4 | **Sécurité** | `SecurityEvent` | `type`, `severity` (enum), `location`, `description`, `occurredAt`, `reportedById` |
| 5 | **Discipline** | `DisciplineRecord` | `studentId`, `type` (enum warning/sanction), `reason`, `date`, `action`, `reportedById` |
| 6 | **Journal** | `JournalEntry` | `classId?` ou `studentId?`, `date`, `category`, `content`, `authorId`, `visibility` (enum CLASS/STUDENT) |
| 7 | **Activités** | `Activity` (+ `ActivityEnrollment`) | activity : `name`, `description`, `schedule`, `capacity`, `supervisorId` · enrollment : `activityId`, `studentId` |

> Les enums (severity, discipline type, visibility, dayOfWeek) sont ajoutés au schéma à côté des enums existants. **Aucune modification** des modèles existants — uniquement des ajouts + relations FK vers `Student`/`Class`/`User` déjà présents.

### 4.2 RBAC (écriture)
- **SCHOOL_ADMIN** : écriture sur tous les domaines.
- **TEACHER** : écriture sur `JournalEntry` (sa classe) et lecture santé/discipline de ses élèves (à confirmer module par module). MVP T2b : écriture journal pour TEACHER, le reste SCHOOL_ADMIN ; affinage RBAC documenté par module.

### 4.3 Hors-périmètre
- **Pas de facturation cantine/transport** (lien `Invoice` → reporté ; les modèles MVP n'incluent pas la tarification automatique).
- **Pas de géoloc temps réel** transport (GPS, tracking) — hors MVP.
- **Pas de workflow médical avancé** (rappels de vaccins automatiques, dossiers médicaux complexes) — MVP = consultation + saisie simple.
- **Aucune modification** de l'isolation, des modèles existants, des workflows CI, du `package.json` racine.

---

## 5. Architecture & pattern

### 5.1 Backend (NestJS) — miroir du module `students`
Chaque domaine reçoit un module calqué sur `apps/api/src/students/` :
- `<domain>.module.ts` (controllers + providers + exports ; `PrismaModule` est `@Global`).
- `<domain>.controller.ts` : `@ApiTags` + `@ApiBearerAuth('access-token')`, verbes CRUD, `@Roles(...)`, `@CurrentUser()`, `getRequestMeta(req)`, Swagger par méthode, matrice RBAC en JSDoc.
- `<domain>.service.ts` : `@Injectable`, `PrismaService`, `$transaction` pour les écritures, `findFirst`/`findMany`+`count` (tenant-scoped auto), soft-delete via `deletedAt`.
- `<domain>.service.spec.ts` : tests unitaires tenant-scoped.
- `dto/<domain>.dto.ts` : DTOs class-validator.

### 5.2 Proxy web
Catch-all `apps/web/app/api/<domain>/[[...action]]/route.ts` calqué sur un proxy existant (ex. `students`), forwarding Authorization + Content-Type vers `${NEXT_PUBLIC_API_URL}/api/<domain>`.

### 5.3 Web — UI CRUD (pattern T2a)
Chaque page remplace son tableau `const` par `useResource('<domain>')` + `<ResourceListPage>` + `<CrudModal>`. États **loading (skeleton) / empty (CTA) / error (Réessayer)** obligatoires ; **plus aucun tableau codé en dur**.

### 5.4 Mobile — ciblé par valeur d'usage
T2b est **web-first**. Sur mobile, on n'expose que ce qui a une vraie valeur terrain (lecture surtout) :
- **Journal (cahier de liaison)** : lecture parent/enseignant — fort intérêt mobile (suivi quotidien). *Inclus mobile (lecture).*
- **Activités** : consultation catalogue — *inclus mobile (lecture).*
- **Cantine (menu de la semaine)** : consultation — *inclus mobile (lecture).*
- **Santé / discipline / sécurité / transport** : back-office → **web uniquement** en T2b (admin CRUD mobile non prioritaire ; réévalué après T2a).

Le CRUD admin mobile complet de ces domaines n'est **pas** dans T2b ; seules les lectures à forte valeur sont portées via le **hub « Gestion »** / écrans existants.

### 5.5 Invariants de sécurité (inchangés)
Isolation dérivée du JWT, `RolesGuard` + `@Roles`, validation Zod (web) / class-validator (API), aucune PII en log (les dossiers santé/discipline sont sensibles → **données sensibles jamais loggées**).

---

## 6. Gestion d'erreurs & états (transverse, identique à T2a)

| État | Comportement (web & mobile) |
|---|---|
| Chargement | Skeleton (jamais spinner nu, jamais contenu démo) |
| Vide | Message informatif + CTA (« Aucune ligne de transport. Ajouter la première ») |
| Erreur | Message lisible + **Réessayer** ; erreur jamais avalée |
| Succès mutation | Invalidation cache + toast ; relecture serveur |
| Non autorisé (403) | Action masquée en amont ; message clair si atteinte |

---

## 7. Stratégie de tests & vérification

- **Migrations** : chaque nouveau modèle → migration testée (création + rollback). Le **test d'isolation multi-tenant existant est étendu** à chaque nouveau modèle (un tenant ne lit jamais les données d'un autre).
- **Unitaire (API)** : services tenant-scoped (Vitest, CI ; bloqué localement par `ERR_DLOPEN_FAILED`).
- **Web** : `type-check` local ; lint/build/E2E en CI. E2E Playwright sur ≥ 1 domaine de bout en bout (créer → reload → vérifier persistance serveur).
- **Persistance prouvée** : reload après création, donnée vient du serveur (critère anti-démo).

---

## 8. Plan de livraison en vagues (tranches verticales)

1 PR par domaine (ou petit groupe), CI verte → merge auto. **Chaque migration = 🛑 validation utilisateur avant `prisma migrate`.**

- **Vague 1 — Vie scolaire (forte valeur, surface mobile)** : Journal → Activités → Cantine.
- **Vague 2 — Suivi élève (web)** : Santé → Discipline.
- **Vague 3 — Opérations établissement (web)** : Sécurité → Transport.

---

## 9. Risques & points d'attention

- **Migrations (risque principal)** : 7 domaines × nouveaux modèles. Mitigation : tranches verticales, une migration ciblée par domaine, **validation utilisateur à chaque 🛑**, migrations idempotentes et réversibles.
- **Données sensibles (santé, discipline)** : PII médicale/comportementale → jamais en log, RBAC strict, à terme RGPD (export/suppression déjà prévus plateforme).
- **Périmètre** : tenir le MVP (pas de tarification cantine, pas de GPS transport, pas de workflow médical) — éviter le scope creep.
- **Collision de nommage santé** : ne pas réutiliser le module healthcheck `health` existant.
- **Seed démo** : étendre `apps/api/prisma/seed.ts` (idempotent) pour peupler ces modèles sur le tenant de démo, cohérent avec la stratégie anti-`DEMO_*` de T2a.

---

## 10. Critères d'acceptation T2b

- [ ] Modèles Prisma créés + migrés pour les 7 domaines ; test d'isolation étendu et vert.
- [ ] Modules NestJS (controller/service/spec/dto) tenant-scoped + RBAC pour chaque domaine.
- [ ] Proxys web `[[...action]]` en place ; pages web branchées sur `useResource`, **aucun tableau `const` codé en dur**, états loading/empty/error+retry partout.
- [ ] Mobile : lectures Journal / Activités / Cantine disponibles (pas de CRUD admin mobile en T2b).
- [ ] Données de démo servies par le **seed** (tenant réel), pas par des constantes de page.
- [ ] `type-check` local vert ; CI verte → merge auto par PR.
- [ ] Chaque migration validée explicitement par l'utilisateur (🛑) ; aucune modification d'isolation, CI, ou `package.json` racine.

---

## 11. Suite

Après validation : `superpowers:writing-plans` pour le plan détaillé T2b (tâches bite-sized par domaine, en commençant par la Vague 1 / Journal comme gabarit). T2c (RH/Paie) et T2d (Admin SaaS) ont leurs specs dédiés.
