# T2b PR-4 — Sécurité Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the hardcoded demo page for **Sécurité** with real, persisted, tenant-scoped, role-adapted modules (Prisma + NestJS + web), per the validated spec `docs/superpowers/specs/2026-05-29-t2b-operational-modules-design.md` (§4.7). School-level only: **no student link, no parent scoping, no notifications**. Closes the 7 operational domains of T2b.

**Architecture:** One `security/` module — routes `/security-incidents`, `/visitor-logs`, `/safety-drills`. Mirrors `apps/api/src/canteen` / `apps/api/src/discipline` (tenant-scoped CRUD, `User` attribution, incident resolution workflow). New additive Prisma models (`SecurityIncident`, `VisitorLog`, `SafetyDrill`) + enums (`SecurityIncidentType`, `SecuritySeverity`, `DrillType`). **`IncidentStatus` already exists** (added in PR-2) — reused, not redefined. Web: `[[...action]]` proxies + typed clients + Zod + tabbed page rewrite. Isolation derives only from the JWT.

**Tech Stack:** NestJS 10, Prisma, PostgreSQL, class-validator, Next.js 14, TanStack Query, react-hook-form, Zod, Vitest.

**Conventions (apply to every task):** identical to PR-2/PR-3.
- cuid2 ids, soft-delete `deletedAt`, `createdAt/updatedAt`. Services scope every query (`tenantId` + `deletedAt: null`); `ForbiddenException({ code: 'TENANT_REQUIRED' })` when `!user.tenantId`. Lists `{ items, total }`. `toResponse()` Date→ISO.
- **No parent scoping** (school-level, no student link). **No notifications.**
- `*ById` attribution → `User` (relations + back-refs), like `discipline_incidents.reportedById`.
- Controllers `@ApiTags`/`@ApiBearerAuth`/`@Roles`/`@CurrentUser`/`@HttpCode`.
- **Local gate = api type-check + web type-check + `pnpm lint` ONLY.**
- **Migration checkpoint:** Task 1 STOPS for explicit user approval; migration hand-authored (copy `20260531130000_t2b_canteen_transport` style), additive only.
- Commits: Conventional Commits, **no `Co-Authored-By`**. Branch: `feat/t2b-pr4-securite` (already created off `origin/main` with PR-3 merged).

---

### Task 1: Prisma models + enums + migration

**Files:** modify `schema.prisma` (3 enums, 3 models, back-refs on `Tenant`, `User`), `tenant.extension.ts` (+3 models), create `apps/api/prisma/migrations/20260531140000_t2b_security/migration.sql`.

- [ ] **Step 1: Add enums + models** after the PR-3 `// T2b — Cantine + Transport` block:

```prisma
// ============================================================================
// T2b — Sécurité (niveau école)
// ============================================================================

enum SecurityIncidentType {
  INTRUSION
  THEFT
  INJURY
  FIRE
  OTHER
}

enum SecuritySeverity {
  LOW
  MEDIUM
  HIGH
}

enum DrillType {
  FIRE
  EARTHQUAKE
  LOCKDOWN
  OTHER
}

// T2b — Incident de sécurité (réutilise IncidentStatus de PR-2).
model SecurityIncident {
  id             String               @id
  tenantId       String
  type           SecurityIncidentType
  severity       SecuritySeverity     @default(LOW)
  location       String?              @db.VarChar(160)
  occurredAt     DateTime
  description    String               @db.Text
  status         IncidentStatus       @default(OPEN)
  resolutionNote String?              @db.Text
  resolvedAt     DateTime?
  reportedById   String
  resolvedById   String?
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  deletedAt      DateTime?

  tenant     Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reportedBy User   @relation("SecurityReported", fields: [reportedById], references: [id])
  resolvedBy User?  @relation("SecurityResolved", fields: [resolvedById], references: [id])

  @@index([tenantId])
  @@index([tenantId, status])
  @@map("security_incidents")
}

// T2b — Journal des visiteurs.
model VisitorLog {
  id           String    @id
  tenantId     String
  visitorName  String    @db.VarChar(160)
  reason       String?   @db.VarChar(300)
  checkInAt    DateTime
  checkOutAt   DateTime?
  badgeNumber  String?   @db.VarChar(40)
  recordedById String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  tenant     Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  recordedBy User   @relation("VisitorLogsRecorded", fields: [recordedById], references: [id])

  @@index([tenantId, checkInAt])
  @@map("visitor_logs")
}

// T2b — Exercice de sécurité (incendie, confinement…).
model SafetyDrill {
  id           String    @id
  tenantId     String
  type         DrillType
  conductedAt  DateTime
  durationMin  Int?
  notes        String?   @db.Text
  recordedById String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  tenant     Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  recordedBy User   @relation("SafetyDrillsRecorded", fields: [recordedById], references: [id])

  @@index([tenantId, conductedAt])
  @@map("safety_drills")
}
```

- [ ] **Step 2: Back-references** (no SQL columns):
  - `model Tenant`: after the PR-3 back-refs add
    ```prisma
    securityIncidents SecurityIncident[] // T2b PR-4
    visitorLogs       VisitorLog[]       // T2b PR-4
    safetyDrills      SafetyDrill[]      // T2b PR-4
    ```
  - `model User`: after the PR-3 (none — PR-3 added none) / PR-2 attribution back-refs add
    ```prisma
    securityReported     SecurityIncident[] @relation("SecurityReported")     // T2b PR-4
    securityResolved     SecurityIncident[] @relation("SecurityResolved")     // T2b PR-4
    visitorLogsRecorded  VisitorLog[]       @relation("VisitorLogsRecorded")  // T2b PR-4
    safetyDrillsRecorded SafetyDrill[]      @relation("SafetyDrillsRecorded") // T2b PR-4
    ```
  - **No `Student` back-refs** (school-level, no student link).

- [ ] **Step 3:** add `'SecurityIncident'`, `'VisitorLog'`, `'SafetyDrill'` to `TENANT_SCOPED_MODELS` (after PR-3 entries).

- [ ] **Step 4:** `prisma format` + `prisma generate` (offline). API type-check requires the regenerated client.

- [ ] **Step 5: 🛑 CHECKPOINT — request user approval** (migration name `t2b_security`). Do not commit SQL until approved.

- [ ] **Step 6: Hand-author the migration** `20260531140000_t2b_security/migration.sql` (additive only): 3× `CREATE TYPE`; 3× `CREATE TABLE` (`occurredAt`/`checkInAt`/`conductedAt` = `TIMESTAMP(3)`, `durationMin` `INTEGER`, `VARCHAR(n)` per `@db`, enum cols with defaults, `status "IncidentStatus" NOT NULL DEFAULT 'OPEN'` — the enum type already exists, **no CREATE TYPE for it**); indexes (`security_incidents_tenantId_idx`, `security_incidents_tenantId_status_idx`, `visitor_logs_tenantId_checkInAt_idx`, `safety_drills_tenantId_conductedAt_idx`); FKs (all `tenantId`→`tenants` CASCADE; `reportedById`/`recordedById`→`users` RESTRICT; `resolvedById`→`users` SET NULL).

> **CI drift check:** `prisma migrate status` must be clean after deploy.

- [ ] **Step 7: Commit** — `feat(api): add SecurityIncident, VisitorLog, SafetyDrill models (T2b PR-4)`.

---

### Task 2: Security DTOs

**Files:** `apps/api/src/security/dto/security-incident.dto.ts`, `visitor-log.dto.ts`, `safety-drill.dto.ts`.

- [ ] **security-incident.dto.ts** (mirror `discipline.dto.ts` minus studentId): `Create` (`type` `@IsEnum`, `severity?`, `location?`@MaxLength(160), `occurredAt` `@IsISO8601`, `description` required @MaxLength(5000)), `Update` (optional type/severity/location/occurredAt/description), `Resolve` (`resolutionNote?`), `ListQuery` (`status?` `@IsEnum(IncidentStatus)`), `Response` (+ `reportedById`/`resolvedById`/`resolvedAt`/`status`), `ListResponse`. `occurredAt`/`resolvedAt` ISO strings.
- [ ] **visitor-log.dto.ts**: `Create` (`visitorName` required @MaxLength(160), `reason?`@MaxLength(300), `checkInAt` `@IsISO8601`, `checkOutAt?` `@IsISO8601`, `badgeNumber?`@MaxLength(40)), `Update` (all optional incl `checkOutAt`), `Response`, `ListResponse`.
- [ ] **safety-drill.dto.ts**: `Create` (`type` `@IsEnum(DrillType)`, `conductedAt` `@IsISO8601`, `durationMin?` `@IsInt @Min(1)`, `notes?`@MaxLength(5000)), `Update`, `Response`, `ListResponse`.
- [ ] Type-check → PASS. Commit: `feat(api): add security DTOs (T2b PR-4)`.

---

### Task 3: Security services (+ specs)

**Files:** `security-incidents.service.ts` (+spec), `visitor-logs.service.ts` (+spec), `safety-drills.service.ts` (+spec).

- [ ] All tenant-scoped CRUD (mirror `canteen-menus.service.ts` — **no parent scoping**). `reportedById`/`recordedById = user.id` on create.
- [ ] **security-incidents.service.ts**: + `resolve(id, dto, user)` setting `status: 'RESOLVED'`, `resolvedAt`, `resolvedById` (mirror `discipline.service.ts` resolve). `list` supports `status` filter. `orderBy: [{ occurredAt: 'desc' }]`.
- [ ] **visitor-logs.service.ts**: `orderBy: { checkInAt: 'desc' }`. Optional `checkOut(id, user)` convenience could be folded into `update` (set `checkOutAt`). Keep just CRUD; `checkOutAt` settable via update.
- [ ] **safety-drills.service.ts**: `orderBy: { conductedAt: 'desc' }`.
- [ ] **Specs** (mirror `canteen-menus.service.spec.ts`): create `TENANT_REQUIRED`; list scopes to tenant; getById missing → NotFound. security-incidents: + resolve sets status RESOLVED + resolvedById.
- [ ] Type-check + (CI) specs → PASS. Commit: `feat(api): security services (incidents + visitors + drills) (T2b PR-4)`.

---

### Task 4: Security controllers + module + registration

**Files:** `security-incidents.controller.ts` (`/security-incidents`, + `:id/resolve`), `visitor-logs.controller.ts` (`/visitor-logs`), `safety-drills.controller.ts` (`/safety-drills`), `security.module.ts`, modify `app.module.ts`.

- [ ] RBAC (§4.8): **all routes (read + write + resolve)** = `SCHOOL_ADMIN, STAFF` only. **No PARENT, no TEACHER.** Mirror `canteen-menus.controller.ts` (drop PARENT from the read roles).
- [ ] `security.module.ts` (no `NotificationsModule`). Register `SecurityModule` in `app.module.ts`. Type-check → PASS. Commit: `feat(api): security controllers + module (T2b PR-4)`.

---

### Task 5: Web proxies

**Files:** `apps/web/app/api/security-incidents/[[...action]]/route.ts`, `visitor-logs/[[...action]]/route.ts`, `safety-drills/[[...action]]/route.ts`.

- [ ] Copy the `journal` proxy, swap resource name. Type-check → PASS. Commit: `feat(web): security API proxies (T2b PR-4)`.

---

### Task 6: Web API client + Zod schemas

**Files:** `apps/web/lib/api/security.ts`, `apps/web/lib/validation/security.schemas.ts`.

- [ ] **security.ts** — `SecurityIncident` (+ `IncidentStatus`/`SecurityIncidentType`/`SecuritySeverity` types), `VisitorLog`, `SafetyDrill` (+ `DrillType`) interfaces + `list*/create*/update*/delete*` (+ `resolveIncident`) over the 3 routes (mirror `health.ts`).
- [ ] **security.schemas.ts** — `INCIDENT_TYPES`, `SEVERITIES`, `DRILL_TYPES` consts; `securityIncidentSchema` (type, severity?, location?, occurredAt required `datetime-local` string, description required), `visitorLogSchema` (visitorName + checkInAt required; reason/checkOutAt/badgeNumber optional), `safetyDrillSchema` (type + conductedAt required; durationMin `z.coerce.number().int().min(1)`/notes optional).
- [ ] Type-check → PASS. Commit: `feat(web): security API client and schemas (T2b PR-4)`.

---

### Task 7: Security page rewrite (real data, tabbed)

**Files:** `apps/web/components/crud/security-incident-form.tsx`, `visitor-log-form.tsx`, `safety-drill-form.tsx`; `apps/web/components/security/incidents-section.tsx`, `visitors-section.tsx`, `drills-section.tsx`; rewrite `apps/web/app/[locale]/(app)/security/page.tsx`.

- [ ] Forms mirror PR-3 forms. Incident: type/severity (`<select>`), location, occurredAt (`datetime-local`), description. Visitor: visitorName, reason, checkInAt/checkOutAt (`datetime-local`), badgeNumber. Drill: type (`<select>`), conductedAt (`datetime-local`), durationMin (number), notes.
- [ ] Sections mirror `apps/web/components/canteen/*-section.tsx` (`canManage = role ∈ {SCHOOL_ADMIN, STAFF}` — **but here that is the only audience**). Incidents section: table (type/severity/status badges, location, date), create/edit/resolve/delete. Visitors section: table (visitorName, reason, check-in/out, badge), create/edit/delete. Drills section: table (type, date, duration, notes), create/edit/delete.
- [ ] Page: access-gate — **only SCHOOL_ADMIN + STAFF** (PARENT + TEACHER → "Accès non autorisé"). Segmented control (`'incidents' | 'visitors' | 'drills'`). Drop the hardcoded `SECURITY_EVENTS`/`EVENT_CONFIG` and the demo stat cards (or derive counts from incidents).
- [ ] Type-check + lint → PASS. Commit: `feat(web): security page on real data (incidents + visitors + drills) (T2b PR-4)`.

---

### Task 8: Seed fixtures (idempotent)

**Files:** modify `apps/api/prisma/seed.ts`.

- [ ] Add `seedSecurity(tenantId)` (mirror `seedDisciplineAndHealth`), called for both demo tenants after the PR-3 calls. Needs a SCHOOL_ADMIN as `reportedById`/`recordedById`; no-op if none. Fixed dates. Guards via `findFirst`:
  - `SecurityIncident`: guard by (tenantId, description fixed); create `type: INTRUSION`, `severity: MEDIUM`, `status: OPEN`.
  - `VisitorLog`: guard by (tenantId, visitorName, checkInAt fixed).
  - `SafetyDrill`: guard by (tenantId, type, conductedAt fixed).
  - Import `SecurityIncidentType`, `SecuritySeverity`, `DrillType` from `@prisma/client`.
- [ ] Type-check → PASS. Commit: `feat(api): seed security fixtures (idempotent, T2b PR-4)`.

---

### Task 9: E2E — RBAC + persistence + isolation

**Files:** `apps/api/test/security.e2e-spec.ts`; modify `apps/api/test/multi-tenant-isolation.e2e-spec.ts`.

- [ ] **security.e2e** (mirror `canteen.e2e-spec.ts` bootstrap; actors ADMIN/STAFF/TEACHER/PARENT):
  - `POST /security-incidents` STAFF → 201; TEACHER → 403; PARENT → 403.
  - `GET /security-incidents` PARENT → 403; TEACHER → 403 (school-level, admin/staff only).
  - `POST /security-incidents/:id/resolve` STAFF → 200/201 (`status: RESOLVED`).
  - `POST /visitor-logs` STAFF → 201; `GET` ADMIN → 200. `POST /safety-drills` ADMIN → 201; TEACHER → 403.
  - Persistence: STAFF-created incident appears in the ADMIN list.
  - cleanup: `securityIncident`, `visitorLog`, `safetyDrill` (+ audit/refresh/user/tenant; **no student**).
- [ ] **isolation e2e**: add `securityIncident`, `visitorLog`, `safetyDrill` to the global `beforeEach` cleanup (their `*ById` FKs are RESTRICT → delete before `user.deleteMany`). In the nested `Operational models isolation (T2b)` block, seed one of each per tenant (referencing the per-tenant SCHOOL_ADMIN), then add `findMany` tenant-scoping + `findFirst` cross-tenant-null tests for the 3 models. Import the 3 new enums.
- [ ] Type-check + lint → PASS. Commit: `test(api): e2e RBAC + isolation for security (T2b PR-4)`.

---

### Task 10: Verify, open PR, auto-merge on green

- [ ] Full gate (api + web type-check + `pnpm lint`) → PASS.
- [ ] Push `feat/t2b-pr4-securite`.
- [ ] Open PR — title `feat(t2b): PR-4 Sécurité (real persisted modules)`. Body: 3 models, RBAC (ADMIN+STAFF only), migration `t2b_security`, "reuses IncidentStatus from PR-2", "completes the 7 T2b operational domains".
- [ ] Watch CI (verify each check explicitly) → auto-merge on green (merge commit). Then **STOP** — T2b umbrella complete; await user direction (T2c RH/Paie is the next track, per spec §11).

---

## Self-review (against the spec)

- **§4.7** (`SecurityIncident` reusing `IncidentStatus`, `VisitorLog`, `SafetyDrill`, enums `SecurityIncidentType`/`SecuritySeverity`/`DrillType`, indexes, `@@map`): Task 1 ✓.
- **§4.8 RBAC** (Sécurité → ADMIN+STAFF CRUD, no PARENT, no TEACHER): Tasks 4, 7, 9 ✓.
- **§5.6 parent scoping**: N/A (school-level, no student link) — intentionally none.
- **§5.7 notifications**: none for Sécurité — correctly omitted.
- **§5.3 web** (no hardcoded data, loading/empty/error, role-adapted, tabbed): Task 7 ✓.
- **§7 tests** (RBAC 200/403, persistence, isolation): Task 9 ✓.
- **§10 migration checkpoint** (additive, no enum mutation — reuses existing `IncidentStatus`): Task 1 Step 5 🛑 ✓.

## Notes
This is the **last T2b PR** (7/7 operational domains). STOP after merge; the next track is T2c (RH/Paie) per spec §11 — do not start without explicit user go-ahead.
