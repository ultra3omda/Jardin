# T2b PR-2 — Discipline + Santé Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded demo pages for **Discipline** and **Santé** with real, persisted, tenant-scoped, role-adapted modules (Prisma + NestJS + web), per the validated spec `docs/superpowers/specs/2026-05-29-t2b-operational-modules-design.md` (§4.1 Discipline, §4.2 Santé). Discipline and infirmary events fan out notifications to parents (§5.7). All medical PII stays out of logs (§5.5, RGPD).

**Architecture:** One Discipline CRUD module (`apps/api/src/discipline/`) and one **new** student-health module (`apps/api/src/student-health/`, routes `/health-records`, `/infirmary-visits`, `/vaccinations`) — **not** the existing `health/` healthcheck. Both mirror `apps/api/src/subjects` (tenant-scoped CRUD) and `apps/api/src/students` / `apps/api/src/evaluations` (parent-scoped reads via `ParentStudent` + V10 notification fan-out). New additive Prisma models (`DisciplineIncident`, `HealthRecord`, `InfirmaryVisit`, `Vaccination`) + enums (`DisciplineSeverity`, `IncidentStatus`, `InfirmaryOutcome`). Web: `[[...action]]` passthrough proxies + typed API clients + page rewrites using the T2a CRUD infra (`useResource`, `ResourceListPage`, `CrudModal`, react-hook-form + Zod, toast). Isolation derives only from the JWT.

**Tech Stack:** NestJS 10, Prisma, PostgreSQL, class-validator, Next.js 14 App Router, TanStack Query, react-hook-form, Zod, Vitest (unit + e2e in CI).

**Conventions (apply to every task):**
- IDs are cuid2 via `import { createId } from '@paralleldrive/cuid2'`. Soft-delete via `deletedAt`. Timestamps `createdAt/updatedAt`.
- Services inject `PrismaService` and scope **every** query explicitly: `where: { tenantId: user.tenantId, deletedAt: null }`; throw `ForbiddenException({ code: 'TENANT_REQUIRED' })` when `!user.tenantId`. Lists return `{ items, total }`. Private `toResponse()` maps Date→ISO string.
- Controllers: `@ApiTags` + `@ApiBearerAuth` + `@Controller('<resource>')`, `@Roles(...)` per route, `@CurrentUser() user: AuthenticatedUser`, `@HttpCode(201|204)` on create/delete.
- Parent reads: `prisma.parentStudent.findMany({ where: { tenantId, parentUserId }, select: { studentId: true } })` → list filters `studentId in ids`; single-record access throws `ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' })` when not owned. Mirror the journal/evaluations pattern exactly.
- **Medical PII is never logged.** No `Logger`/`console` call in the student-health or discipline services may include record content (allergies, conditions, descriptions, reasons, treatments). Fan-out passes only the student name + a generic title.
- **Local validation gate = `pnpm --filter @ecole-saas/api type-check` + `pnpm --filter web type-check` + `pnpm lint` ONLY** (Windows native-binding block → `ERR_DLOPEN_FAILED`; Vitest/`next build`/`prisma migrate` run in CI). Each task's "run test" step is authored for CI; locally, only type-check + lint are executed.
- **Migration checkpoint:** Task 1 STOPS for explicit user approval before any migration is generated/committed (CLAUDE.md 🛑). The migration is **hand-authored** (no local DB; P1000) by copying the format of `apps/api/prisma/migrations/20260530120000_t2b_journal_activities/migration.sql`. Migrations are **additive only** (`CREATE TYPE`/`CREATE TABLE`/`CREATE INDEX`/`ADD CONSTRAINT` — never `ALTER`/`DROP` on existing tables, and **no** `ALTER TYPE` on existing enums).
- **Notification type:** reuse the existing `NotificationType.SYSTEM` for the two new fan-out methods. **Do NOT add a value to the `NotificationType` enum** (that would mutate an existing enum → non-additive migration, against the checkpoint).
- Commits: Conventional Commits, **no `Co-Authored-By`**. Branch: `feat/t2b-pr2-discipline-sante` (already created off `origin/main`).

---

### Task 1: Prisma models + enums + migration (Discipline & Santé)

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add 3 enums, 5 models, back-references on `Tenant`, `User`, `Student`, `Class`)
- Modify: `apps/api/src/common/prisma/tenant.extension.ts` (add 4 models to `TENANT_SCOPED_MODELS`)
- Create: `apps/api/prisma/migrations/20260531120000_t2b_discipline_health/migration.sql`

- [ ] **Step 1: Add enums + models to `schema.prisma`** (place after the T2b Journal/Activities block, i.e. after `model ActivityParticipation`, inside a new `// T2b — Discipline + Santé` section)

```prisma
// ============================================================================
// T2b — Discipline + Santé (PII médicale → RGPD strict)
// ============================================================================

// T2b — Gravité d'un incident de discipline.
enum DisciplineSeverity {
  MINOR
  MAJOR
  SUSPENSION
}

// T2b — Statut de résolution (partagé discipline / sécurité). OPEN par défaut.
enum IncidentStatus {
  OPEN
  RESOLVED
}

// T2b — Issue d'un passage à l'infirmerie. SENT_HOME / EMERGENCY → notifie parents.
enum InfirmaryOutcome {
  RETURNED_TO_CLASS
  SENT_HOME
  REFERRED
  EMERGENCY
}

// T2b — Incident de discipline rattaché à un élève (classe optionnelle).
model DisciplineIncident {
  id             String             @id
  tenantId       String
  studentId      String
  classId        String?
  type           DisciplineSeverity
  occurredAt     DateTime           @db.Date
  description    String             @db.Text
  sanction       String?            @db.VarChar(500)
  status         IncidentStatus     @default(OPEN)
  resolutionNote String?            @db.Text
  resolvedAt     DateTime?
  reportedById   String
  resolvedById   String?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?

  tenant     Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student    Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  class      Class?  @relation(fields: [classId], references: [id], onDelete: SetNull)
  reportedBy User    @relation("DisciplineReported", fields: [reportedById], references: [id])
  resolvedBy User?   @relation("DisciplineResolved", fields: [resolvedById], references: [id])

  @@index([tenantId])
  @@index([tenantId, studentId])
  @@index([tenantId, status])
  @@map("discipline_incidents")
}

// T2b — Dossier de santé d'un élève (1 seul par élève, enforce DB).
model HealthRecord {
  id                    String    @id
  tenantId              String
  studentId             String
  bloodType             String?   @db.VarChar(8)
  allergies             String?   @db.Text
  chronicConditions     String?   @db.Text
  medications           String?   @db.Text
  dietaryRestrictions   String?   @db.Text
  doctorName            String?   @db.VarChar(160)
  doctorPhone           String?   @db.VarChar(40)
  emergencyContactName  String?   @db.VarChar(160)
  emergencyContactPhone String?   @db.VarChar(40)
  notes                 String?   @db.Text
  updatedById           String
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?

  tenant    Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  updatedBy User    @relation("HealthRecordsUpdated", fields: [updatedById], references: [id])

  @@unique([tenantId, studentId], name: "unique_health_record_per_student")
  @@index([tenantId])
  @@map("health_records")
}

// T2b — Passage à l'infirmerie (journal des soins).
model InfirmaryVisit {
  id           String           @id
  tenantId     String
  studentId    String
  visitedAt    DateTime
  reason       String           @db.Text
  treatment    String?          @db.Text
  temperature  Float?
  outcome      InfirmaryOutcome @default(RETURNED_TO_CLASS)
  recordedById String
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  deletedAt    DateTime?

  tenant     Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student    Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  recordedBy User    @relation("InfirmaryVisitsRecorded", fields: [recordedById], references: [id])

  @@index([tenantId, studentId])
  @@index([tenantId, visitedAt])
  @@map("infirmary_visits")
}

// T2b — Vaccination consignée pour un élève.
model Vaccination {
  id             String    @id
  tenantId       String
  studentId      String
  vaccineName    String    @db.VarChar(120)
  administeredAt DateTime  @db.Date
  nextDueAt      DateTime? @db.Date
  notes          String?   @db.VarChar(500)
  recordedById   String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  tenant     Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student    Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  recordedBy User    @relation("VaccinationsRecorded", fields: [recordedById], references: [id])

  @@index([tenantId, studentId])
  @@map("vaccinations")
}
```

- [ ] **Step 2: Add back-references** to existing models (these add NO SQL columns — relation fields only). Place them next to the existing `// T2b` back-refs already present on each model:
  - On `model Tenant { … }` (after the existing `activityParticipations` line):
    ```prisma
    disciplineIncidents DisciplineIncident[] // T2b PR-2
    healthRecords       HealthRecord[]       // T2b PR-2
    infirmaryVisits     InfirmaryVisit[]     // T2b PR-2
    vaccinations        Vaccination[]        // T2b PR-2
    ```
  - On `model User { … }` (after `dailyLogsAuthored`):
    ```prisma
    disciplineReported     DisciplineIncident[] @relation("DisciplineReported")     // T2b PR-2
    disciplineResolved     DisciplineIncident[] @relation("DisciplineResolved")     // T2b PR-2
    healthRecordsUpdated   HealthRecord[]       @relation("HealthRecordsUpdated")   // T2b PR-2
    infirmaryVisitsRecorded InfirmaryVisit[]    @relation("InfirmaryVisitsRecorded") // T2b PR-2
    vaccinationsRecorded   Vaccination[]        @relation("VaccinationsRecorded")   // T2b PR-2
    ```
  - On `model Student { … }` (after `activityParticipations`):
    ```prisma
    disciplineIncidents DisciplineIncident[] // T2b PR-2
    healthRecords       HealthRecord[]       // T2b PR-2 (1/student enforced by @@unique)
    infirmaryVisits     InfirmaryVisit[]     // T2b PR-2
    vaccinations        Vaccination[]        // T2b PR-2
    ```
  - On `model Class { … }` (after `attendances`):
    ```prisma
    disciplineIncidents DisciplineIncident[] // T2b PR-2
    ```

- [ ] **Step 3: Register the 4 models for tenant auto-scoping.** Open `apps/api/src/common/prisma/tenant.extension.ts`, find `TENANT_SCOPED_MODELS`, and append after `'ActivityParticipation', // T2b`:
  ```ts
  'DisciplineIncident', // T2b PR-2
  'HealthRecord', // T2b PR-2
  'InfirmaryVisit', // T2b PR-2
  'Vaccination', // T2b PR-2
  ```

- [ ] **Step 4: Validate the schema (local gate)** — Run: `pnpm --filter @ecole-saas/api exec prisma format && pnpm --filter @ecole-saas/api exec prisma validate`. Expected: "valid 🚀". If the CLI is blocked locally (`ERR_DLOPEN_FAILED`/P1000), skip — CI validates. **Then regenerate the client so type-check sees the new models:** `pnpm --filter @ecole-saas/api exec prisma generate` (this is `postinstall`; it works offline). The new `@prisma/client` types are required for Tasks 2-10 to type-check.

- [ ] **Step 5: 🛑 CHECKPOINT — request user approval for the migration.** Present the model diff above and the migration name `t2b_discipline_health`. **Do not commit the migration SQL until the user approves** (CLAUDE.md migration checkpoint).

- [ ] **Step 6: Hand-author the migration** at `apps/api/prisma/migrations/20260531120000_t2b_discipline_health/migration.sql` (copy the exact statement style of `20260530120000_t2b_journal_activities/migration.sql`). Additive only:

```sql
-- CreateEnum
CREATE TYPE "DisciplineSeverity" AS ENUM ('MINOR', 'MAJOR', 'SUSPENSION');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InfirmaryOutcome" AS ENUM ('RETURNED_TO_CLASS', 'SENT_HOME', 'REFERRED', 'EMERGENCY');

-- CreateTable
CREATE TABLE "discipline_incidents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT,
    "type" "DisciplineSeverity" NOT NULL,
    "occurredAt" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "sanction" VARCHAR(500),
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reportedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "discipline_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "bloodType" VARCHAR(8),
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "medications" TEXT,
    "dietaryRestrictions" TEXT,
    "doctorName" VARCHAR(160),
    "doctorPhone" VARCHAR(40),
    "emergencyContactName" VARCHAR(160),
    "emergencyContactPhone" VARCHAR(40),
    "notes" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infirmary_visits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "treatment" TEXT,
    "temperature" DOUBLE PRECISION,
    "outcome" "InfirmaryOutcome" NOT NULL DEFAULT 'RETURNED_TO_CLASS',
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "infirmary_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "vaccineName" VARCHAR(120) NOT NULL,
    "administeredAt" DATE NOT NULL,
    "nextDueAt" DATE,
    "notes" VARCHAR(500),
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "vaccinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discipline_incidents_tenantId_idx" ON "discipline_incidents"("tenantId");
CREATE INDEX "discipline_incidents_tenantId_studentId_idx" ON "discipline_incidents"("tenantId", "studentId");
CREATE INDEX "discipline_incidents_tenantId_status_idx" ON "discipline_incidents"("tenantId", "status");
CREATE UNIQUE INDEX "unique_health_record_per_student" ON "health_records"("tenantId", "studentId");
CREATE INDEX "health_records_tenantId_idx" ON "health_records"("tenantId");
CREATE INDEX "infirmary_visits_tenantId_studentId_idx" ON "infirmary_visits"("tenantId", "studentId");
CREATE INDEX "infirmary_visits_tenantId_visitedAt_idx" ON "infirmary_visits"("tenantId", "visitedAt");
CREATE INDEX "vaccinations_tenantId_studentId_idx" ON "vaccinations"("tenantId", "studentId");

-- AddForeignKey
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "infirmary_visits" ADD CONSTRAINT "infirmary_visits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "infirmary_visits" ADD CONSTRAINT "infirmary_visits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "infirmary_visits" ADD CONSTRAINT "infirmary_visits_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

> **CI check:** after `prisma migrate deploy`, `prisma migrate status` must be clean (the hand-authored SQL must match what Prisma would generate from the schema). If CI's `migrate diff`/drift check fails, regenerate the SQL via `prisma migrate dev --create-only` in CI and replace the file.

- [ ] **Step 7: Commit** — `git add apps/api/prisma/schema.prisma apps/api/src/common/prisma/tenant.extension.ts apps/api/prisma/migrations && git commit -m "feat(api): add DisciplineIncident, HealthRecord, InfirmaryVisit, Vaccination models (T2b PR-2)"`

---

### Task 2: NotificationFanoutService — discipline + infirmary fan-out

**Files:**
- Modify: `apps/api/src/notifications/notification-fanout.service.ts` (add 2 public methods)
- Modify: `apps/api/src/notifications/notification-fanout.service.spec.ts` (cover the 2 new methods)

- [ ] **Step 1: Add two fan-out methods** after `fanoutAnnouncement` (use `NotificationType.SYSTEM`; mirror `fanoutAbsence`'s shape). Keep titles/bodies generic — **no medical detail**:

```typescript
/** T2b — A discipline incident was recorded for a student. */
async fanoutDisciplineIncident(
  tenantId: string,
  parentUserId: string,
  studentName: string,
  severity: 'MINOR' | 'MAJOR' | 'SUSPENSION',
): Promise<void> {
  const severityLabel =
    severity === 'SUSPENSION' ? 'suspension' : severity === 'MAJOR' ? 'majeur' : 'mineur';
  return this.deliver({
    tenantId,
    userId: parentUserId,
    type: NotificationType.SYSTEM,
    title: `Incident de discipline — ${studentName}`,
    body: `Un incident de discipline (${severityLabel}) a été enregistré pour ${studentName}.`,
    emailSubject: `Incident de discipline — ${studentName}`,
    ctaLabel: "Voir l'incident",
    ctaPath: '/discipline',
    data: { studentName, severity },
  });
}

/** T2b — An infirmary visit ended in the student being sent home / an emergency. */
async fanoutInfirmaryVisit(
  tenantId: string,
  parentUserId: string,
  studentName: string,
  outcome: 'SENT_HOME' | 'EMERGENCY',
): Promise<void> {
  const isEmergency = outcome === 'EMERGENCY';
  return this.deliver({
    tenantId,
    userId: parentUserId,
    type: NotificationType.SYSTEM,
    title: isEmergency
      ? `Urgence infirmerie — ${studentName}`
      : `Passage à l'infirmerie — ${studentName}`,
    body: isEmergency
      ? `${studentName} a été pris(e) en charge à l'infirmerie (urgence). Contactez l'établissement.`
      : `${studentName} a été renvoyé(e) à la maison après un passage à l'infirmerie.`,
    emailSubject: isEmergency
      ? `Urgence infirmerie — ${studentName}`
      : `Passage à l'infirmerie — ${studentName}`,
    ctaLabel: 'Voir le détail',
    ctaPath: '/health',
    data: { studentName, outcome },
  });
}
```

- [ ] **Step 2: Extend the spec** — mirror the existing `fanoutAbsence`/`fanoutGrade` tests in `notification-fanout.service.spec.ts`: assert `fanoutDisciplineIncident` and `fanoutInfirmaryVisit` create an in-app notification of type `SYSTEM` (via the mocked `NotificationsService.create`) and never throw when the recipient lookup fails. Reuse the file's existing mock harness.
- [ ] **Step 3: Type-check** — `pnpm --filter @ecole-saas/api type-check` → PASS.
- [ ] **Step 4: Commit** — `git add apps/api/src/notifications && git commit -m "feat(api): add discipline + infirmary notification fan-out (T2b PR-2)"`

---

### Task 3: Discipline DTOs

**Files:**
- Create: `apps/api/src/discipline/dto/discipline.dto.ts`

- [ ] **Step 1: Write the DTOs** (class-validator + Swagger; mirror `subjects/dto/subject.dto.ts` + `journal/dto/journal.dto.ts`)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisciplineSeverity, IncidentStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDisciplineIncidentDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classId?: string;
  @ApiProperty({ enum: DisciplineSeverity }) @IsEnum(DisciplineSeverity) type!: DisciplineSeverity;
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() occurredAt!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(5000) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sanction?: string;
}

export class UpdateDisciplineIncidentDto {
  @ApiPropertyOptional({ enum: DisciplineSeverity }) @IsOptional() @IsEnum(DisciplineSeverity) type?: DisciplineSeverity;
  @ApiPropertyOptional({ example: '2026-05-30' }) @IsOptional() @IsISO8601() occurredAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sanction?: string;
}

export class ResolveDisciplineIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) resolutionNote?: string;
}

export class ListDisciplineQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional({ enum: IncidentStatus }) @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
}

export class DisciplineIncidentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiPropertyOptional() classId?: string | null;
  @ApiProperty({ enum: DisciplineSeverity }) type!: DisciplineSeverity;
  @ApiProperty() occurredAt!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() sanction?: string | null;
  @ApiProperty({ enum: IncidentStatus }) status!: IncidentStatus;
  @ApiPropertyOptional() resolutionNote?: string | null;
  @ApiPropertyOptional() resolvedAt?: string | null;
  @ApiProperty() reportedById!: string;
  @ApiPropertyOptional() resolvedById?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListDisciplineResponseDto {
  @ApiProperty({ type: [DisciplineIncidentResponseDto] }) items!: DisciplineIncidentResponseDto[];
  @ApiProperty() total!: number;
}
```

- [ ] **Step 2: Type-check** → PASS. **Step 3: Commit** — `git add apps/api/src/discipline/dto && git commit -m "feat(api): add discipline DTOs (T2b PR-2)"`

---

### Task 4: Discipline service (+ unit spec)

**Files:**
- Create: `apps/api/src/discipline/discipline.service.ts`
- Create: `apps/api/src/discipline/discipline.service.spec.ts`

- [ ] **Step 1: Write the failing unit test** (`discipline.service.spec.ts`) — mirror `journal.service.spec.ts`. Inject a mocked `NotificationFanoutService`. Cover: create scopes to tenant + validates student + fans out to parents; `list` as PARENT filters to owned students; `resolve` sets status/resolvedAt/resolvedById; getById missing → NotFound.

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DisciplineService } from './discipline.service';

const admin = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.SCHOOL_ADMIN };
const parent = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

function makePrisma() {
  return {
    disciplineIncident: {
      create: vi.fn().mockResolvedValue({ id: 'i1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }]) },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
  } as never;
}
const fanout = { fanoutDisciplineIncident: vi.fn().mockResolvedValue(undefined) };

describe('DisciplineService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: DisciplineService;
  beforeEach(() => {
    prisma = makePrisma();
    fanout.fanoutDisciplineIncident.mockClear();
    service = new DisciplineService(prisma, fanout as never);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { studentId: 's1', type: 'MINOR', occurredAt: '2026-05-30', description: 'x' },
        { ...admin, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    const arg = prisma.disciplineIncident.findMany.mock.calls[0][0];
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('getById of a missing incident throws NotFound', async () => {
    prisma.disciplineIncident.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — Run (CI): `pnpm --filter @ecole-saas/api exec vitest run src/discipline/discipline.service.spec.ts` → FAIL ("Cannot find module './discipline.service'").

- [ ] **Step 3: Implement `discipline.service.ts`** (tenant-scoped + parent-scoped + fan-out; mirror `journal.service.ts` + `evaluations.service.ts` fanout helper). **No PII in logs.**

```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import type {
  CreateDisciplineIncidentDto,
  DisciplineIncidentResponseDto,
  ListDisciplineQueryDto,
  ListDisciplineResponseDto,
  ResolveDisciplineIncidentDto,
  UpdateDisciplineIncidentDto,
} from './dto/discipline.dto';

type Row = Prisma.DisciplineIncidentGetPayload<{ include: { student: true } }>;

@Injectable()
export class DisciplineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
  ) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListDisciplineQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListDisciplineResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.DisciplineIncidentWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (query.status) where.status = query.status;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.disciplineIncident.findMany({
        where,
        include: { student: true },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.disciplineIncident.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async create(
    dto: CreateDisciplineIncidentDto,
    user: AuthenticatedUser,
  ): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    if (dto.classId) {
      const klass = await this.prisma.class.findFirst({
        where: { id: dto.classId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!klass) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    }
    const row = await this.prisma.disciplineIncident.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        studentId: dto.studentId,
        classId: dto.classId ?? null,
        type: dto.type,
        occurredAt: new Date(dto.occurredAt),
        description: dto.description,
        sanction: dto.sanction ?? null,
        reportedById: user.id,
      },
      include: { student: true },
    });
    // T2b — notify the student's parents. Fire-and-forget; never blocks creation.
    void this.fanoutIncident(
      user.tenantId,
      dto.studentId,
      `${student.firstName} ${student.lastName}`.trim(),
      dto.type,
    );
    return this.toResponse(row);
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateDisciplineIncidentDto,
    user: AuthenticatedUser,
  ): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    const row = await this.prisma.disciplineIncident.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.occurredAt !== undefined ? { occurredAt: new Date(dto.occurredAt) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sanction !== undefined ? { sanction: dto.sanction } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async resolve(
    id: string,
    dto: ResolveDisciplineIncidentDto,
    user: AuthenticatedUser,
  ): Promise<DisciplineIncidentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    const row = await this.prisma.disciplineIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedById: user.id,
        ...(dto.resolutionNote !== undefined ? { resolutionNote: dto.resolutionNote } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.disciplineIncident.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'INCIDENT_NOT_FOUND' });
    await this.prisma.disciplineIncident.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async fanoutIncident(
    tenantId: string,
    studentId: string,
    studentName: string,
    severity: 'MINOR' | 'MAJOR' | 'SUSPENSION',
  ): Promise<void> {
    const parents = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    await Promise.allSettled(
      parents.map((p) =>
        this.fanout.fanoutDisciplineIncident(tenantId, p.parentUserId, studentName, severity),
      ),
    );
  }

  private toResponse(r: Row): DisciplineIncidentResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      classId: r.classId,
      type: r.type,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
      description: r.description,
      sanction: r.sanction,
      status: r.status,
      resolutionNote: r.resolutionNote,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      reportedById: r.reportedById,
      resolvedById: r.resolvedById,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run test, verify it passes** (CI). Locally: `pnpm --filter @ecole-saas/api type-check` → PASS.
- [ ] **Step 5: Commit** — `git add apps/api/src/discipline/discipline.service.ts apps/api/src/discipline/discipline.service.spec.ts && git commit -m "feat(api): discipline service with parent scoping + fan-out (T2b PR-2)"`

---

### Task 5: Discipline controller + module + registration

**Files:**
- Create: `apps/api/src/discipline/discipline.controller.ts`
- Create: `apps/api/src/discipline/discipline.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write `discipline.controller.ts`** (RBAC §4.8: read = ADMIN/TEACHER/PARENT; create = ADMIN/TEACHER; update/resolve/delete = ADMIN). Mirror `subjects.controller.ts`.

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateDisciplineIncidentDto,
  DisciplineIncidentResponseDto,
  ListDisciplineQueryDto,
  ListDisciplineResponseDto,
  ResolveDisciplineIncidentDto,
  UpdateDisciplineIncidentDto,
} from './dto/discipline.dto';
import { DisciplineService } from './discipline.service';

/**
 * T2b — Incidents de discipline.
 * RBAC : SCHOOL_ADMIN (CRUD + résolution) · TEACHER (crée + lit) · PARENT (lit ses enfants).
 */
@ApiTags('discipline')
@ApiBearerAuth()
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly service: DisciplineService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'List discipline incidents (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDisciplineQueryDto,
  ): Promise<ListDisciplineResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDisciplineIncidentDto,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDisciplineIncidentDto,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Mark an incident resolved (SCHOOL_ADMIN)' })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisciplineIncidentDto,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.resolve(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
```

- [ ] **Step 2: Write `discipline.module.ts`** (imports `NotificationsModule`, like `evaluations.module.ts`)

```typescript
import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';

/** T2b — Discipline incidents (SCHOOL_ADMIN / TEACHER / PARENT-read). */
@Module({
  imports: [NotificationsModule],
  controllers: [DisciplineController],
  providers: [DisciplineService],
})
export class DisciplineModule {}
```

- [ ] **Step 3: Register in `app.module.ts`** — add `import { DisciplineModule } from './discipline/discipline.module';` (alphabetical, near `DemoLoginModule`) and add `DisciplineModule, // T2b PR-2` to the `imports` array near `JournalModule`.
- [ ] **Step 4: Type-check** → PASS. **Step 5: Commit** — `git add apps/api/src/discipline/discipline.controller.ts apps/api/src/discipline/discipline.module.ts apps/api/src/app.module.ts && git commit -m "feat(api): discipline controller + module (T2b PR-2)"`

---

### Task 6: student-health DTOs (records, visits, vaccinations)

**Files:**
- Create: `apps/api/src/student-health/dto/health-record.dto.ts`
- Create: `apps/api/src/student-health/dto/infirmary-visit.dto.ts`
- Create: `apps/api/src/student-health/dto/vaccination.dto.ts`

- [ ] **Step 1: `health-record.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHealthRecordDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) bloodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) allergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) chronicConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) medications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) dietaryRestrictions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) doctorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

// Update = same optional fields minus studentId (the record is bound to its student).
export class UpdateHealthRecordDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8) bloodType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) allergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) chronicConditions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) medications?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) dietaryRestrictions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) doctorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) doctorPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ListHealthRecordsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class HealthRecordResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiPropertyOptional() bloodType?: string | null;
  @ApiPropertyOptional() allergies?: string | null;
  @ApiPropertyOptional() chronicConditions?: string | null;
  @ApiPropertyOptional() medications?: string | null;
  @ApiPropertyOptional() dietaryRestrictions?: string | null;
  @ApiPropertyOptional() doctorName?: string | null;
  @ApiPropertyOptional() doctorPhone?: string | null;
  @ApiPropertyOptional() emergencyContactName?: string | null;
  @ApiPropertyOptional() emergencyContactPhone?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() updatedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListHealthRecordsResponseDto {
  @ApiProperty({ type: [HealthRecordResponseDto] }) items!: HealthRecordResponseDto[];
  @ApiProperty() total!: number;
}
```

- [ ] **Step 2: `infirmary-visit.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InfirmaryOutcome } from '@prisma/client';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateInfirmaryVisitDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty({ example: '2026-05-30T09:30:00.000Z' }) @IsISO8601() visitedAt!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) treatment?: string;
  @ApiPropertyOptional({ minimum: 30, maximum: 45 }) @IsOptional() @IsNumber() @Min(30) @Max(45) temperature?: number;
  @ApiPropertyOptional({ enum: InfirmaryOutcome }) @IsOptional() @IsEnum(InfirmaryOutcome) outcome?: InfirmaryOutcome;
}

export class UpdateInfirmaryVisitDto {
  @ApiPropertyOptional({ example: '2026-05-30T09:30:00.000Z' }) @IsOptional() @IsISO8601() visitedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) treatment?: string;
  @ApiPropertyOptional({ minimum: 30, maximum: 45 }) @IsOptional() @IsNumber() @Min(30) @Max(45) temperature?: number;
  @ApiPropertyOptional({ enum: InfirmaryOutcome }) @IsOptional() @IsEnum(InfirmaryOutcome) outcome?: InfirmaryOutcome;
}

export class ListInfirmaryVisitsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class InfirmaryVisitResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() visitedAt!: string;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional() treatment?: string | null;
  @ApiPropertyOptional() temperature?: number | null;
  @ApiProperty({ enum: InfirmaryOutcome }) outcome!: InfirmaryOutcome;
  @ApiProperty() recordedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListInfirmaryVisitsResponseDto {
  @ApiProperty({ type: [InfirmaryVisitResponseDto] }) items!: InfirmaryVisitResponseDto[];
  @ApiProperty() total!: number;
}
```

- [ ] **Step 3: `vaccination.dto.ts`**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVaccinationDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) vaccineName!: string;
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() administeredAt!: string;
  @ApiPropertyOptional({ example: '2027-05-30' }) @IsOptional() @IsISO8601() nextDueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateVaccinationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) vaccineName?: string;
  @ApiPropertyOptional({ example: '2026-05-30' }) @IsOptional() @IsISO8601() administeredAt?: string;
  @ApiPropertyOptional({ example: '2027-05-30' }) @IsOptional() @IsISO8601() nextDueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ListVaccinationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class VaccinationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() vaccineName!: string;
  @ApiProperty() administeredAt!: string;
  @ApiPropertyOptional() nextDueAt?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() recordedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListVaccinationsResponseDto {
  @ApiProperty({ type: [VaccinationResponseDto] }) items!: VaccinationResponseDto[];
  @ApiProperty() total!: number;
}
```

- [ ] **Step 4: Type-check** → PASS. **Step 5: Commit** — `git add apps/api/src/student-health/dto && git commit -m "feat(api): add student-health DTOs (T2b PR-2)"`

---

### Task 7: student-health services (3 services + specs)

**Files:**
- Create: `apps/api/src/student-health/health-records.service.ts` (+ `.spec.ts`)
- Create: `apps/api/src/student-health/infirmary-visits.service.ts` (+ `.spec.ts`)
- Create: `apps/api/src/student-health/vaccinations.service.ts` (+ `.spec.ts`)

> All three are tenant-scoped + parent-scoped (mirror `discipline.service.ts`). **No medical PII in logs.** Each service has its own private `parentStudentIds()` helper and validates the student belongs to the tenant on write. Parent reads filter `studentId in ownedIds`; single-record access throws `STUDENT_NOT_OWNED_BY_PARENT`.

- [ ] **Step 1: `health-records.service.ts`** — CRUD with **one record per student** (P2002 on `unique_health_record_per_student` → `BadRequestException({ code: 'HEALTH_RECORD_ALREADY_EXISTS' })`). `updatedById = user.id` on create + update. `toResponse()` includes `studentName`. Methods: `list(query,user)`, `getById(id,user)`, `create(dto,user)`, `update(id,dto,user)`, `remove(id,user)`.

```typescript
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateHealthRecordDto, HealthRecordResponseDto, ListHealthRecordsQueryDto,
  ListHealthRecordsResponseDto, UpdateHealthRecordDto,
} from './dto/health-record.dto';

type Row = Prisma.HealthRecordGetPayload<{ include: { student: true } }>;

@Injectable()
export class HealthRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId }, select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(query: ListHealthRecordsQueryDto, user: AuthenticatedUser): Promise<ListHealthRecordsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.HealthRecordWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId = query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.healthRecord.findMany({ where, include: { student: true }, orderBy: { updatedAt: 'desc' }, take: 500 }),
      this.prisma.healthRecord.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<HealthRecordResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.healthRecord.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null }, include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'HEALTH_RECORD_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
    }
    return this.toResponse(row);
  }

  async create(dto: CreateHealthRecordDto, user: AuthenticatedUser): Promise<HealthRecordResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null }, select: { id: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.healthRecord.create({
        data: {
          id: createId(), tenantId: user.tenantId, studentId: dto.studentId,
          bloodType: dto.bloodType ?? null, allergies: dto.allergies ?? null,
          chronicConditions: dto.chronicConditions ?? null, medications: dto.medications ?? null,
          dietaryRestrictions: dto.dietaryRestrictions ?? null, doctorName: dto.doctorName ?? null,
          doctorPhone: dto.doctorPhone ?? null, emergencyContactName: dto.emergencyContactName ?? null,
          emergencyContactPhone: dto.emergencyContactPhone ?? null, notes: dto.notes ?? null,
          updatedById: user.id,
        },
        include: { student: true },
      });
      return this.toResponse(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'HEALTH_RECORD_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateHealthRecordDto, user: AuthenticatedUser): Promise<HealthRecordResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.healthRecord.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'HEALTH_RECORD_NOT_FOUND' });
    const row = await this.prisma.healthRecord.update({
      where: { id },
      data: {
        ...this.pickDefined(dto),
        updatedById: user.id,
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.healthRecord.findFirst({ where: { id, tenantId: user.tenantId, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'HEALTH_RECORD_NOT_FOUND' });
    await this.prisma.healthRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private pickDefined(dto: UpdateHealthRecordDto): Prisma.HealthRecordUpdateInput {
    const keys: (keyof UpdateHealthRecordDto)[] = [
      'bloodType', 'allergies', 'chronicConditions', 'medications', 'dietaryRestrictions',
      'doctorName', 'doctorPhone', 'emergencyContactName', 'emergencyContactPhone', 'notes',
    ];
    const out: Record<string, unknown> = {};
    for (const k of keys) if (dto[k] !== undefined) out[k] = dto[k];
    return out as Prisma.HealthRecordUpdateInput;
  }

  private toResponse(r: Row): HealthRecordResponseDto {
    return {
      id: r.id, studentId: r.studentId, studentName: `${r.student.firstName} ${r.student.lastName}`,
      bloodType: r.bloodType, allergies: r.allergies, chronicConditions: r.chronicConditions,
      medications: r.medications, dietaryRestrictions: r.dietaryRestrictions, doctorName: r.doctorName,
      doctorPhone: r.doctorPhone, emergencyContactName: r.emergencyContactName,
      emergencyContactPhone: r.emergencyContactPhone, notes: r.notes, updatedById: r.updatedById,
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 2: `infirmary-visits.service.ts`** — same shape; inject `NotificationFanoutService`. On **create**, if `outcome ∈ {SENT_HOME, EMERGENCY}` → `void this.fanoutVisit(...)`. On **update**, if the new `outcome ∈ {SENT_HOME, EMERGENCY}` AND `existing.outcome ∉ {SENT_HOME, EMERGENCY}` → fan out (avoid double-notify). `fanoutVisit` resolves parents via `parentStudent.findMany({ where: { tenantId, studentId } })` then `Promise.allSettled(parents.map((p) => this.fanout.fanoutInfirmaryVisit(tenantId, p.parentUserId, studentName, outcome)))`. `temperature` maps straight through; `visitedAt` ISO. Fields: reason/treatment/temperature/outcome.

- [ ] **Step 3: `vaccinations.service.ts`** — plain tenant + parent-scoped CRUD (no fan-out). `administeredAt`/`nextDueAt` are `@db.Date` → `toResponse` slices to `YYYY-MM-DD` (and `nextDueAt` may be null).

- [ ] **Step 4: Unit specs** — one per service, mirror `discipline.service.spec.ts`: create throws `TENANT_REQUIRED` without tenant; `list` as PARENT restricts `studentId` to owned ids; getById missing → NotFound. For `health-records.service.spec.ts` add: P2002 on create → `BadRequestException`. For `infirmary-visits.service.spec.ts` add: create with `outcome: 'EMERGENCY'` calls `fanout.fanoutInfirmaryVisit`; create with `outcome: 'RETURNED_TO_CLASS'` does **not**.

- [ ] **Step 5: Type-check + (CI) run the 3 specs** → PASS.
- [ ] **Step 6: Commit** — `git add apps/api/src/student-health/*.service.ts apps/api/src/student-health/*.service.spec.ts && git commit -m "feat(api): student-health services (records, infirmary, vaccinations) with parent scoping + fan-out (T2b PR-2)"`

---

### Task 8: student-health controllers + module + registration

**Files:**
- Create: `apps/api/src/student-health/health-records.controller.ts`
- Create: `apps/api/src/student-health/infirmary-visits.controller.ts`
- Create: `apps/api/src/student-health/vaccinations.controller.ts`
- Create: `apps/api/src/student-health/student-health.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Three controllers** — `@Controller('health-records')`, `@Controller('infirmary-visits')`, `@Controller('vaccinations')`. RBAC §4.8: **read** (`GET` list + `GET :id`) = `SCHOOL_ADMIN, STAFF, PARENT`; **write** (`POST`/`PATCH`/`DELETE`) = `SCHOOL_ADMIN, STAFF`. **TEACHER has no access to any health route.** Mirror `discipline.controller.ts` shape (Swagger tags `health-records` / `infirmary-visits` / `vaccinations`, `@ApiBearerAuth`, `@HttpCode(201)` on create, `@HttpCode(204)` on delete). Each delegates to its service.

- [ ] **Step 2: `student-health.module.ts`** (imports `NotificationsModule` for the infirmary fan-out)

```typescript
import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { HealthRecordsController } from './health-records.controller';
import { HealthRecordsService } from './health-records.service';
import { InfirmaryVisitsController } from './infirmary-visits.controller';
import { InfirmaryVisitsService } from './infirmary-visits.service';
import { VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';

/**
 * T2b — Santé scolaire (PII médicale). Distinct du healthcheck `HealthModule`.
 * RBAC : SCHOOL_ADMIN + STAFF gèrent · PARENT lit ses enfants · TEACHER aucun accès.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [HealthRecordsController, InfirmaryVisitsController, VaccinationsController],
  providers: [HealthRecordsService, InfirmaryVisitsService, VaccinationsService],
})
export class StudentHealthModule {}
```

- [ ] **Step 3: Register in `app.module.ts`** — `import { StudentHealthModule } from './student-health/student-health.module';` + add `StudentHealthModule, // T2b PR-2` to `imports` (near `DisciplineModule`). **Do not touch `HealthModule`** (the existing `/health` healthcheck).
- [ ] **Step 4: Type-check** → PASS. **Step 5: Commit** — `git add apps/api/src/student-health apps/api/src/app.module.ts && git commit -m "feat(api): student-health controllers + module (T2b PR-2)"`

---

### Task 9: Web proxies (discipline + student-health)

**Files:**
- Create: `apps/web/app/api/discipline/[[...action]]/route.ts`
- Create: `apps/web/app/api/health-records/[[...action]]/route.ts`
- Create: `apps/web/app/api/infirmary-visits/[[...action]]/route.ts`
- Create: `apps/web/app/api/vaccinations/[[...action]]/route.ts`

- [ ] **Step 1-4: Copy `apps/web/app/api/journal/[[...action]]/route.ts` verbatim** for each, replacing the two `journal` occurrences (the JSDoc line + the `targetUrl` `/api/journal`) with `discipline`, `health-records`, `infirmary-visits`, `vaccinations` respectively. Final `targetUrl` e.g. `` `${API_URL}/api/health-records${suffix}${url.search}` ``.
- [ ] **Step 5: Type-check** — `pnpm --filter web type-check` → PASS.
- [ ] **Step 6: Commit** — `git add apps/web/app/api/discipline apps/web/app/api/health-records apps/web/app/api/infirmary-visits apps/web/app/api/vaccinations && git commit -m "feat(web): discipline + student-health API proxies (T2b PR-2)"`

---

### Task 10: Web API clients + Zod schemas

**Files:**
- Create: `apps/web/lib/api/discipline.ts`
- Create: `apps/web/lib/api/health.ts` (records + visits + vaccinations)
- Create: `apps/web/lib/validation/discipline.schemas.ts`
- Create: `apps/web/lib/validation/health.schemas.ts`

- [ ] **Step 1: `discipline.ts`** (mirror `apps/web/lib/api/activities.ts`)

```typescript
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type DisciplineSeverity = 'MINOR' | 'MAJOR' | 'SUSPENSION';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface DisciplineIncident {
  id: string; studentId: string; studentName: string; classId: string | null;
  type: DisciplineSeverity; occurredAt: string; description: string; sanction: string | null;
  status: IncidentStatus; resolutionNote: string | null; resolvedAt: string | null;
  reportedById: string; resolvedById: string | null; createdAt: string; updatedAt: string;
}
export interface ListDisciplineResponse { items: DisciplineIncident[]; total: number; }
export interface CreateDisciplineInput {
  studentId: string; classId?: string; type: DisciplineSeverity; occurredAt: string;
  description: string; sanction?: string;
}
export type UpdateDisciplineInput = Partial<Omit<CreateDisciplineInput, 'studentId' | 'classId'>>;

const BASE = '/api/discipline';
export const listDiscipline = (token: string) => apiGet<ListDisciplineResponse>(BASE, token);
export const createIncident = (token: string, input: CreateDisciplineInput) => apiPost<DisciplineIncident>(BASE, token, input);
export const updateIncident = (token: string, id: string, input: UpdateDisciplineInput) => apiPatch<DisciplineIncident>(`${BASE}/${id}`, token, input);
export const resolveIncident = (token: string, id: string, resolutionNote?: string) => apiPost<DisciplineIncident>(`${BASE}/${id}/resolve`, token, { resolutionNote });
export const deleteIncident = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);
```

- [ ] **Step 2: `health.ts`** — three resource groups (records, visits, vaccinations) with their interfaces + `list*/create*/update*/delete*` functions over `/api/health-records`, `/api/infirmary-visits`, `/api/vaccinations`. Mirror the discipline client. Include `InfirmaryOutcome = 'RETURNED_TO_CLASS' | 'SENT_HOME' | 'REFERRED' | 'EMERGENCY'`.

- [ ] **Step 3: `discipline.schemas.ts`** (mirror `activities.schemas.ts`)

```typescript
import { z } from 'zod';

export const SEVERITIES = ['MINOR', 'MAJOR', 'SUSPENSION'] as const;

export const disciplineSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  classId: z.string().optional(),
  type: z.enum(SEVERITIES),
  occurredAt: z.string().min(1, 'Date requise'),
  description: z.string().min(1, 'Description requise').max(5000),
  sanction: z.string().max(500).optional(),
});
export type DisciplineValues = z.infer<typeof disciplineSchema>;

export const resolveSchema = z.object({ resolutionNote: z.string().max(5000).optional() });
export type ResolveValues = z.infer<typeof resolveSchema>;
```

- [ ] **Step 4: `health.schemas.ts`** — `OUTCOMES` const + `healthRecordSchema` (studentId + optional medical text fields, each `.max(...)`), `infirmaryVisitSchema` (studentId, visitedAt, reason required; treatment/temperature(`z.coerce.number().min(30).max(45).optional()`)/outcome optional), `vaccinationSchema` (studentId, vaccineName, administeredAt required; nextDueAt/notes optional). Export the inferred value types.

- [ ] **Step 5: Type-check** → PASS. **Step 6: Commit** — `git add apps/web/lib/api/discipline.ts apps/web/lib/api/health.ts apps/web/lib/validation/discipline.schemas.ts apps/web/lib/validation/health.schemas.ts && git commit -m "feat(web): discipline + health API clients and schemas (T2b PR-2)"`

---

### Task 11: Discipline page rewrite (real data, role-adapted)

**Files:**
- Create: `apps/web/components/crud/discipline-incident-form.tsx`
- Modify (full rewrite): `apps/web/app/[locale]/(app)/discipline/page.tsx`

- [ ] **Step 1: Write `discipline-incident-form.tsx`** (mirror `activity-form.tsx`; `zodResolver(disciplineSchema)`; fields: `studentId` (text — student picker deferred), `type` (`<select>` over `SEVERITIES`), `occurredAt` (`type="date"`), `description` (Input), `sanction` (Input). Export `DisciplineIncidentForm({ defaultValues, submitLabel, pending, onSubmit, onCancel })` usable for create + edit).

- [ ] **Step 2: Rewrite `discipline/page.tsx`** — delete the hardcoded `INCIDENTS`. Keep `TYPE_CONFIG` re-keyed to `MINOR/MAJOR/SUSPENSION`; add a status badge (OPEN/RESOLVED). Mirror `activities/page.tsx`:
  - `'use client'`; `useAuthStore` for `accessToken` + `user`.
  - `isAdmin = user?.role === 'SCHOOL_ADMIN'`; `isContributor = isAdmin || user?.role === 'TEACHER'`.
  - `useResource(['discipline','list'], listDiscipline)` → `data.items`.
  - `ResourceListPage` (title "Discipline", description with open/resolved counts derived from items, `action` = "Signaler un incident" when `isContributor`, loading/empty/error+retry, `skeletonCols={3}`, empty title "Aucun incident").
  - Render the incidents as the existing table style (date, élève=`studentName`, type badge, description, sanction, statut badge). **Action column** (only when `isAdmin`): "Modifier" (edit modal), "Résoudre" (visible when `status==='OPEN'` → `resolveMut.mutate(id)`), "Supprimer".
  - `useMutation` for create (`createIncident`), edit (`updateIncident`), resolve (`resolveIncident`), delete (`deleteIncident`); each `invalidateQueries(['discipline','list'])` + toast. Create/edit via `CrudModal` + `DisciplineIncidentForm`.
  - `occurredAt` from `disciplineSchema` is `YYYY-MM-DD`; pass straight to the API (DTO is `@IsISO8601`).
- [ ] **Step 3: Type-check + lint** → PASS (escape apostrophes in JSX as `&apos;`).
- [ ] **Step 4: Commit** — `git add apps/web/components/crud/discipline-incident-form.tsx "apps/web/app/[locale]/(app)/discipline/page.tsx" && git commit -m "feat(web): discipline page on real data (T2b PR-2)"`

---

### Task 12: Santé page rewrite (real data, role-adapted, tabbed)

**Files:**
- Create: `apps/web/components/crud/infirmary-visit-form.tsx`
- Create: `apps/web/components/crud/health-record-form.tsx`
- Create: `apps/web/components/crud/vaccination-form.tsx`
- Create: `apps/web/components/health/infirmary-visits-section.tsx`
- Create: `apps/web/components/health/vaccinations-section.tsx`
- Create: `apps/web/components/health/health-records-section.tsx`
- Modify (full rewrite): `apps/web/app/[locale]/(app)/health/page.tsx`

- [ ] **Step 1: Three forms** (mirror `activity-form.tsx`):
  - `infirmary-visit-form.tsx`: `studentId`, `visitedAt` (`type="datetime-local"`), `reason`, `treatment`, `temperature` (`type="number"` step 0.1, like the durationMin numeric pattern in `activity-form.tsx`), `outcome` (`<select>` over `OUTCOMES`).
  - `health-record-form.tsx`: `studentId` (create only — hidden/omitted on edit via `defaultValues`), `bloodType`, `allergies`, `chronicConditions`, `medications`, `dietaryRestrictions`, `doctorName`, `doctorPhone`, `emergencyContactName`, `emergencyContactPhone`, `notes`.
  - `vaccination-form.tsx`: `studentId`, `vaccineName`, `administeredAt` (`type="date"`), `nextDueAt` (`type="date"`), `notes`.

- [ ] **Step 2: Three section components** — each self-contained: `useResource` over its list fn, `ResourceListPage`-less inner list (the page owns the header) OR a compact card list with loading/empty/error states reusing `ResourceListPage`. Use `ResourceListPage` per section (it renders its own sub-header via `title`/`description`). Each section:
  - `canManage = user?.role === 'SCHOOL_ADMIN' || user?.role === 'STAFF'`.
  - List rows as cards/rows showing `studentName` + the domain fields; **manage actions only when `canManage`**.
  - Mutations (create/edit/delete) + toast + `invalidateQueries`.
  - For **infirmary**: badge the `outcome` (RETURNED_TO_CLASS/SENT_HOME/REFERRED/EMERGENCY) with the SENT_HOME/EMERGENCY ones styled as warnings.

- [ ] **Step 3: Rewrite `health/page.tsx`** — delete `HEALTH_NOTES`/`TYPE_CONFIG`. Keep the **RGPD banner**. Add an **access gate**: if `user?.role` is not in `('SCHOOL_ADMIN','STAFF','PARENT')` (i.e. TEACHER) → render a clear "Accès non autorisé" message (TEACHER has no health access per §4.8). Render a small segmented control (3 buttons backed by local `useState<'infirmary'|'vaccinations'|'records'>`) and conditionally render the active section. Header: "Santé" + "Suivi médical et infirmerie."
- [ ] **Step 4: Type-check + lint** → PASS.
- [ ] **Step 5: Commit** — `git add apps/web/components/crud/infirmary-visit-form.tsx apps/web/components/crud/health-record-form.tsx apps/web/components/crud/vaccination-form.tsx apps/web/components/health "apps/web/app/[locale]/(app)/health/page.tsx" && git commit -m "feat(web): health page on real data (infirmary, vaccinations, records) (T2b PR-2)"`

---

### Task 13: Seed fixtures (idempotent)

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add `seedDisciplineAndHealth(tenantId)`** next to `seedJournalAndActivities`, called for both demo tenants after parents are linked (so fan-out targets exist; the function fan-out path is irrelevant in seed — we write rows directly). Idempotent guards (no natural unique except HealthRecord):
  - Fetch `author` = a `SCHOOL_ADMIN` (reporter / updater / recorder) and `someStudents = findMany({ tenantId, deletedAt: null, take: 3 })`. No-op if either is empty.
  - **DisciplineIncident**: for the first student, guard via `findFirst({ where: { tenantId, studentId, description: FIXED } })`; create if missing with `type: 'MINOR'`, `occurredAt: new Date('2026-05-20')` (fixed), `reportedById: author.id`, `status: 'OPEN'`.
  - **HealthRecord**: `upsert({ where: { unique_health_record_per_student: { tenantId, studentId } }, update: {}, create: { … allergies: 'Arachides', updatedById: author.id } })` for the first student.
  - **InfirmaryVisit**: guard via `findFirst({ where: { tenantId, studentId, visitedAt: FIXED_TS } })` (`new Date('2026-05-22T09:30:00.000Z')`), create with `reason: 'Maux de tête'`, `outcome: 'RETURNED_TO_CLASS'`, `recordedById: author.id`.
  - **Vaccination**: guard via `findFirst({ where: { tenantId, studentId, vaccineName: 'DTP' } })`, create with `administeredAt: new Date('2025-09-15')`, `recordedById: author.id`.
  - Import `DisciplineSeverity`, `InfirmaryOutcome` from `@prisma/client` at the top (next to `ActivityCategory`).
  - Use only **fixed dates** (never argless `new Date()`).
- [ ] **Step 2: Call it** — after the two `await seedJournalAndActivities(...)` lines: `await seedDisciplineAndHealth(ecole.id); await seedDisciplineAndHealth(maternelle.id);`
- [ ] **Step 3: Type-check** → PASS. (Seed runs in CI/dev.)
- [ ] **Step 4: Commit** — `git add apps/api/prisma/seed.ts && git commit -m "feat(api): seed discipline + health fixtures (idempotent, T2b PR-2)"`

---

### Task 14: E2E — RBAC + persistence + isolation (discipline & student-health)

**Files:**
- Create: `apps/api/test/discipline.e2e-spec.ts`
- Create: `apps/api/test/student-health.e2e-spec.ts`
- Modify: `apps/api/test/multi-tenant-isolation.e2e-spec.ts` (extend the T2b "Operational models isolation" block)

- [ ] **Step 1: `discipline.e2e-spec.ts`** — bootstrap like `apps/api/test/journal.e2e-spec.ts` (full `AppModule`, `R2Service` mocked, `ValidationPipe`, prefix `api`, FK-safe `cleanup`). Seed tenant A: SCHOOL_ADMIN, TEACHER, PARENT linked to `studentOwned`, plus `studentOther`, and pre-seed one incident per student (author = admin). Assert:
  - `POST /discipline` (for `studentOwned`) as TEACHER → 201; as PARENT → 403.
  - `GET /discipline` as PARENT → only `studentOwned` incidents (never `studentOther`); `GET /discipline?studentId=<studentOther>` as PARENT does not leak.
  - `GET /discipline/:id` of a `studentOther` incident as PARENT → 403 `code: 'STUDENT_NOT_OWNED_BY_PARENT'`.
  - `POST /discipline/:id/resolve` as TEACHER → 403; as SCHOOL_ADMIN → 200 with `status: 'RESOLVED'`, `resolvedById` set.
  - `PATCH`/`DELETE` as TEACHER → 403.
  - Persistence: create as TEACHER → `GET /discipline` (admin) includes it.
  - **cleanup** must `disciplineIncident.deleteMany({ where: { tenant: { slug } } })` before students/users.

- [ ] **Step 2: `student-health.e2e-spec.ts`** — same bootstrap. Add a STAFF actor. Seed tenant A + parent link + `studentOwned`/`studentOther`. Assert across the three resources:
  - **health-records**: `POST /health-records` as STAFF → 201; as TEACHER → 403; as PARENT → 403. Second `POST` for the same student → 400 `HEALTH_RECORD_ALREADY_EXISTS`. `GET /health-records` as PARENT → only owned; `GET /health-records/:id` of `studentOther`'s record as PARENT → 403 `STUDENT_NOT_OWNED_BY_PARENT`. TEACHER `GET /health-records` → 403.
  - **infirmary-visits**: `POST` as STAFF (`outcome: 'SENT_HOME'`) → 201; as PARENT → 403. `GET` as PARENT → only owned. (Fan-out is fire-and-forget — assert the 201, not delivery.)
  - **vaccinations**: `POST` as SCHOOL_ADMIN → 201; as TEACHER → 403; `GET` as PARENT → only owned.
  - **cleanup** order: `vaccination` → `infirmaryVisit` → `healthRecord` → `parentStudent` → `auditLog`/`refreshToken` → `student` → `user` → `tenant` (all `deleteMany` by tenant slug / email domain, `.catch(() => undefined)`).

- [ ] **Step 3: Extend `multi-tenant-isolation.e2e-spec.ts`** — inside the existing `describe('Operational models isolation (T2b)')`, in its nested `beforeEach`, **also** seed (per tenant, referencing the per-tenant student + the per-tenant SCHOOL_ADMIN author): one `DisciplineIncident`, one `HealthRecord`, one `InfirmaryVisit`, one `Vaccination`. Then add tests proving `tenantPrisma.client.{disciplineIncident,healthRecord,infirmaryVisit,vaccination}.findMany()` returns only tenant-A rows and `.findFirst({ where: { id: <tenantB id> } })` from tenant-A context returns `null`. Import `DisciplineSeverity`, `InfirmaryOutcome` from `@prisma/client`. **Also** add the four new tables to the top-of-`beforeEach` cleanup deletes (before `student.deleteMany`): `disciplineIncident`, `healthRecord`, `infirmaryVisit`, `vaccination` (their `*ById` FKs are RESTRICT → must be deleted before `user.deleteMany`; seeding them in the nested block — which runs after the global `beforeEach` — keeps the existing user-delete isolation tests green, exactly like the journal/activities precedent).

- [ ] **Step 4: Run e2e (CI)** — `pnpm --filter @ecole-saas/api exec vitest run --config vitest.e2e.config.ts` → PASS. Locally only `type-check`.
- [ ] **Step 5: Commit** — `git add apps/api/test && git commit -m "test(api): e2e RBAC + isolation for discipline + student-health (T2b PR-2)"`

---

### Task 15: Verify, open PR, auto-merge on green

- [ ] **Step 1: Full local gate** — `pnpm --filter @ecole-saas/api type-check && pnpm --filter web type-check && pnpm lint` → all PASS, zero lint warnings.
- [ ] **Step 2: Push** — `git push -u origin feat/t2b-pr2-discipline-sante`.
- [ ] **Step 3: Open PR** (only when the user has asked for one / per the umbrella workflow) — base `main`, head `feat/t2b-pr2-discipline-sante`, title `feat(t2b): PR-2 Discipline + Santé (real persisted modules)`. Body: new models, RBAC matrix (§4.8 Discipline + Santé), migration name `t2b_discipline_health`, notification fan-out (discipline created, infirmary SENT_HOME/EMERGENCY), RGPD note (no PII logged), and "Part of the T2b umbrella spec".
- [ ] **Step 4: Watch CI** — verify EXPLICITLY with `gh pr checks <N>` (build + unit + e2e + GitGuardian + Vercel); do not trust `--watch` exit code alone.
- [ ] **Step 5: Auto-merge on green** — `gh pr merge <N> --merge` (merge commit, no `Co-Authored-By`). Then **STOP** — do not start PR-3 (Cantine + Transport) without user validation.

---

## Self-review (against the spec)

- **Spec §4.1 (DisciplineIncident) + enums `DisciplineSeverity`/`IncidentStatus`:** Task 1 ✓ (fields, `classId?` SetNull relation, indexes, `@@map`).
- **Spec §4.2 (HealthRecord 1/student `@@unique`, InfirmaryVisit, Vaccination) + enum `InfirmaryOutcome`:** Task 1 ✓; module named `student-health`, routes `/health-records` `/infirmary-visits` `/vaccinations`, **not** the `health` healthcheck (Tasks 7-8) ✓ (§2.1 collision note honored).
- **Spec §4.8 RBAC:** Discipline read=ADMIN/TEACHER/PARENT, create=ADMIN/TEACHER, update/resolve/delete=ADMIN (Task 5) ✓. Santé manage=ADMIN+STAFF, read=PARENT, **TEACHER none** (Task 8) ✓.
- **Spec §5.6 parent-scoped reads (`STUDENT_NOT_OWNED_BY_PARENT`):** every read service (discipline + 3 health) ✓, tested Task 14.
- **Spec §5.7 notifications (V10 fan-out):** discipline create → parents; infirmary SENT_HOME/EMERGENCY → parents; reuses `NotificationFanoutService`, `NotificationType.SYSTEM` (no enum migration) — Tasks 2/4/7 ✓.
- **Spec §5.5 / §9 PII & RGPD:** no medical content in logs; RGPD banner kept on the web page; fan-out carries only student name — Tasks 4/7/12 ✓.
- **Spec §5.3 web (no hardcoded data, loading/empty/error, role-adapted):** Tasks 11 & 12 ✓; health page TEACHER access-gate ✓.
- **Spec §7 tests (RBAC 200/403, persistence, isolation tenant + parent):** Task 14 ✓.
- **Spec §10 migration checkpoint (additive, no enum mutation):** Task 1 Step 5 🛑 ✓; hand-authored SQL, additive only ✓.
- **Type consistency:** query keys (`['discipline','list']`, `['infirmary-visits','list']`, …), enums (`DisciplineSeverity`/`IncidentStatus`/`InfirmaryOutcome`), and `studentName` projection used identically across API client, pages, and tests.

## Notes for the next plans (same gabarit)
PR-3 (Cantine + Transport) and PR-4 (Sécurité) each reuse Tasks 1-15 as the template. **STOP after PR-2 merges** — do not start PR-3 without explicit user go-ahead.
