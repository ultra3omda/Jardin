# T2b — Modules opérationnels (cantine, transport, santé, sécurité, discipline, journal, activités) — Design

> **Statut :** Validé MVP (2026-05-30), **mis à jour le 2026-05-30 vers la profondeur relationnelle** (décision utilisateur explicite : liaisons élève complètes + workflows + lectures parent scopées). Plan à produire après T2d (livré) via `superpowers:writing-plans`.
> **Date :** 2026-05-29 (révisé 2026-05-30)
> **Track :** Track 2 (capacités opérationnelles), sous-projet **T2b**.
> **Références :** `docs/superpowers/specs/2026-05-29-school-admin-crud-remediation-design.md` (T2a — pattern CRUD que T2b réutilise) ; `apps/api/src/subjects/` et `apps/api/src/students/` (modules canoniques).

---

## 1. Objectif

Doter d'un **backend réel et profond** les 7 modules opérationnels aujourd'hui **100 % démo front-end**
(tableaux codés en dur, aucune persistance) : **cantine, transport, santé, sécurité, discipline,
journal (cahier de liaison), activités**.

Contrairement à T2a (qui câble des backends existants), **T2b crée les modèles Prisma manquants** +
modules NestJS + proxys web + UI CRUD, en **réutilisant le pattern CRUD figé par T2a** (`useResource`,
`<ResourceListPage>`, `<CrudModal>`, états loading/empty/error+retry, **aucun fallback démo**).

**Profondeur relationnelle (décision 2026-05-30)** : on ne se limite pas à un CRUD plat. Chaque domaine
modélise ses **liaisons réelles** (`Student`, `Class`, `User`), ses **sous-entités** (arrêts de bus,
visites d'infirmerie, vaccinations, participations…) et ses **workflows** (résolution d'incident,
statut). Les **parents lisent les données de leurs propres enfants** (scoping dédié).

En une phrase : *un SCHOOL_ADMIN gère menus, lignes de transport, dossiers de santé, incidents de sécurité
et de discipline, journaux quotidiens et activités — avec persistance réelle et liens élève — pendant que
enseignants/personnel contribuent selon leur rôle et que les parents consultent ce qui concerne leurs
enfants.*

---

## 2. Constat (état actuel, factuel)

### 2.1 Zéro backend sur les 7 domaines
Audit confirmé : **aucun modèle Prisma, aucun module NestJS, aucun proxy web** pour ces domaines. Les 7
pages existent et sont déjà câblées dans la navigation par rôle/type d'établissement (`apps/web/lib/nav/menu.ts`),
mais 100 % des données sont codées en dur.

| Domaine | Page web | Tableau démo codé en dur |
|---|---|---|
| Cantine | `apps/web/app/[locale]/(app)/canteen/page.tsx` | `WEEKLY_MENU`, `STATS` |
| Transport | `…/(app)/transport/page.tsx` | `BUS_ROUTES` |
| Santé | `…/(app)/health/page.tsx` | `HEALTH_NOTES` |
| Sécurité | `…/(app)/security/page.tsx` | `SECURITY_EVENTS` |
| Discipline | `…/(app)/discipline/page.tsx` | `INCIDENTS` |
| Journal | `…/(app)/journal/page.tsx` | `JOURNAL_ENTRIES` |
| Activités | `…/(app)/activities/page.tsx` | `ACTIVITIES` |

> ⚠️ **Collision de nommage santé** : `apps/api/src/health/` existant est un **healthcheck HTTP** (`/health`),
> **sans rapport** avec la santé scolaire. Le module santé scolaire sera nommé `student-health`
> (dir `apps/api/src/student-health/`) et exposera des routes `/health-records`, `/infirmary-visits`,
> `/vaccinations` — **ne pas réutiliser** le module healthcheck.

### 2.2 Le problème central
Aucune donnée n'est persistée : tout est figé dans le composant. La remédiation impose de **créer le socle
de données** (modèles + migrations) puis de brancher le web dessus (et le mobile en lecture là où la valeur
terrain le justifie, §5.4).

---

## 3. Décisions verrouillées (entrées de ce design)

| Décision | Choix retenu |
|---|---|
| **Profondeur** | **Relationnelle** (liaisons élève, sous-entités, workflows, lectures parent). *(MAJ 2026-05-30 — remplace le MVP « saisie simple » initial.)* |
| **Migrations Prisma** | **REQUISES** (nouveaux modèles, **additives uniquement**). Chaque migration = **🛑 checkpoint CLAUDE.md** → validation utilisateur avant `prisma migrate`. Le schéma documenté §4 vaut pré-validation. |
| **Pattern CRUD** | **Réutilise le pattern T2a** (web) et les modules canoniques `subjects`/`students` (API). Pas de moteur générique (YAGNI). |
| **Format spec** | **Spec parapluie unique** (les 7 domaines) → le plan découpe en **~4 PRs** (tranches verticales par domaine/petit groupe). |
| **Surfaces** | **Web prioritaire et complet** pour les 7. **Mobile en lecture** ciblé (Journal, Activités, Cantine), pas de CRUD admin mobile en T2b (§5.4). |
| **Isolation** | Inchangée : `tenantId` + index sur chaque modèle ; `RolesGuard`+`@Roles` ; extension Prisma globale ; **+ scoping explicite en service**. Lectures parent via `ParentStudent` (§5.6). |

---

## 4. Périmètre — Modèles de données (profonds)

Conventions communes à **tous** les nouveaux modèles : `id String @id` (cuid2 via `createId()`) ·
`tenantId String` (non-null) · `createdAt @default(now())` · `updatedAt @updatedAt` · `deletedAt DateTime?`
(soft-delete) · relation `tenant Tenant @relation(fields:[tenantId], references:[id], onDelete: Cascade)` +
back-reference sur `Tenant` · `@@index([tenantId])` + index sur colonnes filtrables · `@@map("snake_case")`.
Les attributions (`*ById`) → `User` (relations nommées + back-ref). Les liens `Student` → `onDelete: Cascade`.
**Aucune modification des modèles existants** — uniquement ajouts (tables + enums + back-references virtuelles).

### 4.1 Discipline
```
enum DisciplineSeverity { MINOR  MAJOR  SUSPENSION }
enum IncidentStatus     { OPEN   RESOLVED }

DisciplineIncident { studentId, classId?, type:DisciplineSeverity, occurredAt @db.Date,
  description @db.Text, sanction? @db.VarChar(500), status:IncidentStatus @default(OPEN),
  resolutionNote? @db.Text, resolvedAt?, reportedById→User, resolvedById?→User }
  // @@index([tenantId]) @@index([tenantId, studentId]) @@index([tenantId, status]) @@map("discipline_incidents")
```

### 4.2 Santé (module `student-health` — PII médicale → RGPD)
```
enum InfirmaryOutcome { RETURNED_TO_CLASS  SENT_HOME  REFERRED  EMERGENCY }

HealthRecord { studentId (1 seul/élève), bloodType? @db.VarChar(8), allergies? @db.Text,
  chronicConditions? @db.Text, medications? @db.Text, dietaryRestrictions? @db.Text,
  doctorName? , doctorPhone? , emergencyContactName? , emergencyContactPhone? , notes? @db.Text,
  updatedById→User }   // @@unique([tenantId, studentId]) @@map("health_records")
InfirmaryVisit { studentId, visitedAt, reason @db.Text, treatment? @db.Text, temperature? Float,
  outcome:InfirmaryOutcome @default(RETURNED_TO_CLASS), recordedById→User }
  // @@index([tenantId, studentId]) @@index([tenantId, visitedAt]) @@map("infirmary_visits")
Vaccination { studentId, vaccineName @db.VarChar(120), administeredAt @db.Date, nextDueAt? @db.Date,
  notes? @db.VarChar(500), recordedById→User }   // @@index([tenantId, studentId]) @@map("vaccinations")
```

### 4.3 Cantine
```
enum MealRegime { STANDARD  VEGETARIAN  HALAL  NO_PORK  OTHER }

CanteenMenu { date @db.Date, starter?, main?, dessert?, vegetarian? (@db.VarChar(200)) }   // niveau école
  // @@unique([tenantId, date]) @@index([tenantId, date]) @@map("canteen_menus")
MealPlan { studentId (1/élève), regime:MealRegime @default(STANDARD), allergies? @db.Text,
  active Boolean @default(true), notes? @db.VarChar(500) }   // @@unique([tenantId, studentId]) @@map("meal_plans")
```

### 4.4 Transport
```
enum RouteStatus { ACTIVE  INACTIVE }      enum TransportDirection { MORNING  EVENING  BOTH }

BusRoute { name @db.VarChar(120), driverName?, driverPhone?, vehiclePlate? @db.VarChar(20),
  departureTime @db.VarChar(5) "HH:mm", returnTime? @db.VarChar(5), status:RouteStatus @default(ACTIVE),
  capacity? Int }   // relations stops[], assignments[] ; @@index([tenantId]) @@map("bus_routes")
BusStop { routeId, name @db.VarChar(120), order Int, pickupTime? @db.VarChar(5) }
  // route BusRoute(Cascade) ; @@index([tenantId, routeId]) @@map("bus_stops")
TransportAssignment { studentId, routeId, stopId?, direction:TransportDirection @default(BOTH) }
  // @@unique([tenantId, studentId, routeId, direction]) ; student(Cascade), route(Cascade), stop(SetNull) @@map("transport_assignments")
```

### 4.5 Journal (maternelle — cahier de liaison)
```
enum ChildMood { HAPPY  CALM  TIRED  UPSET  SICK }

DailyLogEntry { studentId, date @db.Date, meals? @db.VarChar(200), nap? @db.VarChar(200), mood? ChildMood,
  bathroom? @db.VarChar(200), activitiesNote? @db.Text, generalNote? @db.Text, authorId→User }
  // @@unique([tenantId, studentId, date]) @@index([tenantId, date]) @@index([tenantId, studentId]) @@map("daily_log_entries")
```

### 4.6 Activités (maternelle)
```
enum ActivityCategory { ART  MUSIC  SPORT  OUTING  OTHER }

Activity { name @db.VarChar(160), description? @db.Text, category:ActivityCategory @default(OTHER),
  scheduledAt? DateTime, durationMin? Int, location? @db.VarChar(160) }   // participations[] ; @@index([tenantId]) @@map("activities")
ActivityParticipation { activityId, studentId }
  // @@unique([activityId, studentId]) ; activity(Cascade), student(Cascade) ; @@index([tenantId, activityId]) @@map("activity_participations")
```

### 4.7 Sécurité (niveau école)
```
enum SecurityIncidentType { INTRUSION  THEFT  INJURY  FIRE  OTHER }
enum SecuritySeverity     { LOW  MEDIUM  HIGH }
enum DrillType            { FIRE  EARTHQUAKE  LOCKDOWN  OTHER }

SecurityIncident { type:SecurityIncidentType, severity:SecuritySeverity @default(LOW), location? @db.VarChar(160),
  occurredAt, description @db.Text, status:IncidentStatus @default(OPEN), resolutionNote? @db.Text, reportedById→User }
  // @@index([tenantId]) @@index([tenantId, status]) @@map("security_incidents")
VisitorLog { visitorName @db.VarChar(160), reason? @db.VarChar(300), checkInAt, checkOutAt?, badgeNumber? @db.VarChar(40), recordedById→User }
  // @@index([tenantId, checkInAt]) @@map("visitor_logs")
SafetyDrill { type:DrillType, conductedAt, durationMin? Int, notes? @db.Text, recordedById→User }
  // @@index([tenantId, conductedAt]) @@map("safety_drills")
```

> **≈16 modèles, ~10 enums.** Back-references à ajouter sur `Tenant` (1 tableau/modèle) et `User`
> (relations d'attribution nommées). Les enums (`severity`, `dayOfWeek`, etc.) sont ajoutés à côté des
> enums existants. Colonnes finales et noms exacts figés en `writing-plans`.

### 4.8 RBAC (synthèse — détail §5.6)

| Domaine | SCHOOL_ADMIN | TEACHER | STAFF | PARENT (ses enfants) |
|---|---|---|---|---|
| Discipline | CRUD + résoudre | crée + lit | — | lecture |
| Santé | CRUD | — *(sensible)* | CRUD (infirmier) | lecture |
| Cantine | CRUD | — | CRUD | lecture menu + plan |
| Transport | CRUD | — | CRUD | lecture |
| Journal | CRUD | crée + édite | — | lecture |
| Activités | CRUD | crée + édite | — | lecture |
| Sécurité | CRUD | — | CRUD | — |

### 4.9 Hors-périmètre
- **Pas de facturation** cantine/transport (lien `Invoice` reporté → Finance/T2c).
- **Pas de géoloc temps réel** transport (GPS, tracking).
- **Pas de workflow médical avancé** (rappels vaccins automatiques) ni de pièces jointes (certificats/photos via R2) — différés.
- **Pas d'analytics inter-domaines** ni de CRUD admin mobile complet.
- **Aucune modification** de l'isolation, des modèles existants, des workflows CI, du `package.json` racine.

---

## 5. Architecture & pattern

### 5.1 Backend (NestJS) — miroir de `students` / `subjects`
Chaque domaine reçoit un module calqué sur `apps/api/src/students/` (pour le parent-scoping) et
`apps/api/src/subjects/` (pour le CRUD tenant-scoped simple) :
- `<domain>.module.ts` (controller + service ; `PrismaModule` est `@Global`), enregistré dans `app.module.ts`.
- `<domain>.controller.ts` : `@ApiTags` + `@ApiBearerAuth`, verbes CRUD (+ sous-ressources), `@Roles(...)`,
  `@CurrentUser()`, Swagger par méthode, matrice RBAC en JSDoc.
- `<domain>.service.ts` : `@Injectable`, `PrismaService`, scoping `tenantId` **explicite**,
  `ForbiddenException('TENANT_REQUIRED')`, `findFirst`/`findMany`+`count`, soft-delete `deletedAt`,
  cuid2, `P2002 → BadRequest`, listes `{ items, total }`, mapper `toResponse()`. `$transaction` pour les
  écritures multi-tables (ex. route+stops).
- `<domain>.service.spec.ts` : tests unitaires tenant-scoped + parent-scoped.
- `dto/<domain>.dto.ts` : DTOs `class-validator` + `@ApiProperty`.

### 5.2 Proxy web
Catch-all `apps/web/app/api/<domain>/[[...action]]/route.ts` calqué sur un proxy existant
(`students`/`subjects`), forwarding `Authorization` + `Content-Type` vers `${NEXT_PUBLIC_API_URL}/api/<domain>`.

### 5.3 Web — UI CRUD (pattern T2a)
Chaque page remplace son tableau `const` par `useResource('<domain>')` + `<ResourceListPage>` +
`<CrudModal>` (+ Zod dans `apps/web/lib/validation/<domain>.schemas.ts`). Affichage **adapté au rôle**
courant (lecture seule pour PARENT/TEACHER selon §4.8). États **loading (skeleton) / empty (CTA) /
error (Réessayer)** obligatoires ; **plus aucun tableau codé en dur**. Libellés adaptés au type
d'établissement (KG vs primaire) comme `menu.ts`.

### 5.4 Mobile — lecture ciblée par valeur d'usage (conservé du spec initial)
T2b est **web-first**. Sur mobile, on n'expose que les lectures à forte valeur terrain :
- **Journal (cahier de liaison)** : lecture parent/enseignant — *inclus mobile (lecture)*.
- **Activités** : consultation catalogue/participations — *inclus mobile (lecture)*.
- **Cantine (menu)** : consultation — *inclus mobile (lecture)*.
- **Santé / discipline / sécurité / transport** : back-office → **web uniquement** en T2b.

Le CRUD admin mobile complet n'est **pas** dans T2b ; seules les lectures à forte valeur sont portées via
les écrans/hub existants.

### 5.5 Invariants de sécurité (inchangés)
Isolation dérivée du JWT, `RolesGuard` + `@Roles`, validation Zod (web) / class-validator (API),
**aucune PII en log** (dossiers santé/discipline sensibles → jamais loggés).

### 5.6 Lectures PARENT scopées
Pattern repris de `evaluations.service.ts` / `students.service.ts` :
- Helper `resolveParentStudentIds(tenantId, parentUserId): string[]` →
  `prisma.parentStudent.findMany({ where:{ tenantId, parentUserId }, select:{ studentId:true } })`.
- Liste parent → `where.studentId = { in: ids }` (ids vide ⇒ liste vide, pas d'erreur).
- Accès unitaire parent → si `studentId ∉ ids` : `ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' })`.

### 5.7 Notifications (réutilise V10 `NotificationFanoutService`)
- Discipline : création d'incident → notifie les parents de l'élève.
- Santé : `InfirmaryVisit` `outcome ∈ {SENT_HOME, EMERGENCY}` → notifie les parents.
- Journal : notification optionnelle — **hors lot** par défaut (volume quotidien élevé).

---

## 6. Gestion d'erreurs & états (transverse, identique à T2a)

| État | Comportement (web & mobile) |
|---|---|
| Chargement | Skeleton (jamais spinner nu, jamais contenu démo) |
| Vide | Message informatif + CTA (« Aucune ligne de transport. Ajouter la première ») |
| Erreur | Message lisible + **Réessayer** ; erreur jamais avalée |
| Succès mutation | Invalidation cache + toast ; relecture serveur |
| Non autorisé (403) | Action masquée en amont ; message clair si atteinte |

Enveloppe d'erreur API : `{ code, message }` (ex. `INCIDENT_NOT_FOUND`, `STUDENT_NOT_OWNED_BY_PARENT`,
`TENANT_REQUIRED`).

---

## 7. Stratégie de tests & vérification

- **Migrations** : chaque nouveau modèle → migration additive testée. Le **test d'isolation multi-tenant
  existant est étendu** à chaque nouveau modèle (un tenant ne lit jamais les données d'un autre).
- **Unitaire (API, Vitest, CI)** : services tenant-scoped + parent-scoped + transitions de statut +
  contraintes d'unicité (HealthRecord/MealPlan/DailyLog). Bloqué localement par `ERR_DLOPEN_FAILED`.
- **E2E (`apps/api/test/<domain>.e2e-spec.ts`)** : matrice RBAC (200 autorisés / **403** sinon) ;
  round-trip persistance (create → list/get → update → soft-delete) ; **isolation** (tenant A ⇏ tenant B ;
  **parent A ⇏ enfant famille B**).
- **Web** : `type-check` local ; lint/build/E2E en CI. E2E Playwright sur ≥ 1 domaine de bout en bout
  (créer → reload → vérifier persistance serveur = critère anti-démo).
- **Couverture** ≥ 70 % sur la logique métier.
- **Validation locale = `tsc --noEmit` + lint UNIQUEMENT** (blocage natif Windows ; build/unit/e2e en CI).

---

## 8. Plan de livraison (umbrella spec → ~4 PRs, tranches verticales)

1 PR par groupe de domaines (modèle → migration → module NestJS → proxy → web → seed → tests). CI verte →
merge auto. **Chaque migration = 🛑 validation utilisateur avant `prisma migrate`.** Ordre conçu pour livrer
d'abord la forte valeur (lecture mobile) tout en posant tôt le pattern « entité liée élève + lecture parent ».

- **PR-1 — Journal + Activités** (maternelle ; forte valeur + lecture mobile ; pose le pattern
  entité-liée-élève + lecture parent + auteur).
- **PR-2 — Discipline + Santé** (suivi élève sensible ; fanout notifications ; RGPD).
- **PR-3 — Cantine + Transport** (logistique ; lecture mobile du menu ; ressource partagée + inscription/affectation).
- **PR-4 — Sécurité** (incidents + visiteurs + exercices, niveau école).

> Le présent spec + le plan d'implémentation (writing-plans) seront committés avec PR-1 (docs de la piste).
> L'ordre/regroupement exact reste ajustable au plan.

---

## 9. Risques & points d'attention

- **Migrations (risque principal)** : 7 domaines × nouveaux modèles. Mitigation : tranches verticales, une
  migration ciblée par PR, **validation utilisateur à chaque 🛑**, migrations **additives** (aucun backfill,
  aucun risque sur les données existantes).
- **Données sensibles (santé, discipline)** : PII médicale/comportementale → jamais en log, RBAC strict,
  RGPD (export/suppression déjà prévus plateforme).
- **Profondeur vs scope creep** : la profondeur relationnelle est cadrée par §4 (pas de tarification, pas de
  GPS, pas de pièces jointes, pas de workflow médical avancé) — tenir cette limite.
- **Collision de nommage santé** : module `student-health`, **pas** le healthcheck `health`.
- **Lectures parent** : le scoping §5.6 doit être testé (isolation parent) sur chaque domaine lisible parent.
- **Seed démo** : étendre `apps/api/prisma/seed.ts` (idempotent) pour peupler ces modèles sur les tenants de
  démo, cohérent avec la stratégie anti-`DEMO_*` de T2a.

---

## 10. Critères d'acceptation T2b

- [ ] Modèles Prisma créés + migrés (additifs) pour les 7 domaines ; test d'isolation étendu et vert.
- [ ] Modules NestJS (controller/service/spec/dto) tenant-scoped + parent-scoped + RBAC (§4.8) par domaine.
- [ ] Proxys web `[[...action]]` en place ; pages web branchées sur `useResource`, **aucun tableau `const`
      codé en dur**, états loading/empty/error+retry partout, vues adaptées par rôle.
- [ ] Mobile : lectures Journal / Activités / Cantine disponibles (pas de CRUD admin mobile en T2b).
- [ ] Notifications fanout câblées (discipline créée, infirmerie SENT_HOME/EMERGENCY).
- [ ] Données de démo servies par le **seed** (tenant réel), pas par des constantes de page.
- [ ] `type-check` + lint locaux verts ; CI verte → merge auto par PR (merge commit, Conventional Commits).
- [ ] Chaque migration validée explicitement (🛑) ; aucune modif d'isolation, CI, ou `package.json` racine.

---

## 11. Suite

Après revue de ce spec mis à jour : `superpowers:writing-plans` pour le plan détaillé T2b (tâches
bite-sized par domaine, en commençant par PR-1 / Journal+Activités comme gabarit). T2c (RH/Paie) suit
ensuite (« les deux l'une après l'autre »). T2d (Admin SaaS) est livré.
