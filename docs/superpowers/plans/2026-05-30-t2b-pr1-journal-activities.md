# T2b PR-1 — Journal + Activités Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded demo pages for **Journal (cahier de liaison)** and **Activités** with real, persisted, tenant-scoped, role-adapted modules (Prisma + NestJS + web), per the validated spec `docs/superpowers/specs/2026-05-29-t2b-operational-modules-design.md`.

**Architecture:** Two new NestJS CRUD modules (`journal`, `activities`) mirroring `apps/api/src/subjects` (tenant-scoped service, `@Roles` controller) and `apps/api/src/students` (parent-scoped reads via `ParentStudent`). New additive Prisma models (`DailyLogEntry`, `Activity`, `ActivityParticipation`) + enums. Web: `[[...action]]` passthrough proxies + typed API clients + page rewrites using the T2a CRUD infra (`useResource`, `ResourceListPage`, `CrudModal`, react-hook-form + Zod, toast). Isolation derives only from the JWT.

**Tech Stack:** NestJS 10, Prisma, PostgreSQL, class-validator, Next.js 14 App Router, TanStack Query, react-hook-form, Zod, Vitest (unit + e2e in CI).

**Conventions (apply to every task):**
- IDs are cuid2 via `import { createId } from '@paralleldrive/cuid2'`. Soft-delete via `deletedAt`. Timestamps `createdAt/updatedAt`.
- Services inject `PrismaService` and scope **every** query explicitly: `where: { tenantId: user.tenantId, deletedAt: null }`; throw `ForbiddenException({ code: 'TENANT_REQUIRED' })` when `!user.tenantId`. Lists return `{ items, total }`. Private `toResponse()` maps Date→ISO string.
- Controllers: `@ApiTags` + `@ApiBearerAuth` + `@Controller('<resource>')`, `@Roles(...)` per route, `@CurrentUser() user: AuthenticatedUser`, `@HttpCode(201|204)` on create/delete.
- Parent reads: `prisma.parentStudent.findMany({ where: { tenantId, parentUserId }, select: { studentId: true } })` → list filters `studentId in ids`; single-record access throws `ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' })` when not owned.
- **Local validation gate = `pnpm --filter @ecole-saas/api type-check` + `pnpm --filter web type-check` + `pnpm lint` ONLY** (Windows native-binding block → `ERR_DLOPEN_FAILED`; Vitest/`next build`/`prisma migrate` run in CI). Each task's "run test" step is authored for CI; locally, only type-check + lint are executed.
- **Migration checkpoint:** Task 1 STOPS for explicit user approval before any `prisma migrate` is generated/committed (CLAUDE.md 🛑).
- Commits: Conventional Commits, **no `Co-Authored-By`**. Branch: `feat/t2b-operational-modules` (already created off `origin/main`).

---

### Task 1: Prisma models + enums + migration (Journal & Activités)

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add 2 enums, 3 models, back-references on `Tenant`, `User`, `Student`)
- Modify: `apps/api/src/common/prisma/tenant.extension.ts` (add 3 models to `TENANT_SCOPED_MODELS`)
- Create (via CI/dev): `apps/api/prisma/migrations/<timestamp>_t2b_journal_activities/migration.sql`

- [ ] **Step 1: Add enums + models to `schema.prisma`** (place after the `Attendance` model / `AttendanceStatus` enum, with the other domain models)

```prisma
enum ChildMood {
  HAPPY
  CALM
  TIRED
  UPSET
  SICK
}

enum ActivityCategory {
  ART
  MUSIC
  SPORT
  OUTING
  OTHER
}

model DailyLogEntry {
  id             String     @id
  tenantId       String
  studentId      String
  date           DateTime   @db.Date
  meals          String?    @db.VarChar(200)
  nap            String?    @db.VarChar(200)
  mood           ChildMood?
  bathroom       String?    @db.VarChar(200)
  activitiesNote String?    @db.Text
  generalNote    String?    @db.Text
  authorId       String
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  deletedAt      DateTime?

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  author  User    @relation("DailyLogsAuthored", fields: [authorId], references: [id])

  @@unique([tenantId, studentId, date], name: "unique_daily_log_per_day")
  @@index([tenantId, date])
  @@index([tenantId, studentId])
  @@map("daily_log_entries")
}

model Activity {
  id          String           @id
  tenantId    String
  name        String           @db.VarChar(160)
  description String?          @db.Text
  category    ActivityCategory @default(OTHER)
  scheduledAt DateTime?
  durationMin Int?
  location    String?          @db.VarChar(160)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?

  tenant         Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  participations ActivityParticipation[]

  @@index([tenantId])
  @@map("activities")
}

model ActivityParticipation {
  id         String   @id
  tenantId   String
  activityId String
  studentId  String
  createdAt  DateTime @default(now())

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  student  Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([activityId, studentId], name: "unique_participation")
  @@index([tenantId, activityId])
  @@map("activity_participations")
}
```

- [ ] **Step 2: Add back-references** to existing models (these add NO SQL columns — relation fields only):
  - On `model Tenant { … }`: add
    ```prisma
    dailyLogEntries        DailyLogEntry[]         // T2b
    activities             Activity[]              // T2b
    activityParticipations ActivityParticipation[] // T2b
    ```
  - On `model User { … }`: add
    ```prisma
    dailyLogsAuthored DailyLogEntry[] @relation("DailyLogsAuthored") // T2b
    ```
  - On `model Student { … }`: add
    ```prisma
    dailyLogEntries        DailyLogEntry[]         // T2b
    activityParticipations ActivityParticipation[] // T2b
    ```

- [ ] **Step 3: Register the 3 models for tenant auto-scoping.** Open `apps/api/src/common/prisma/tenant.extension.ts`, find the `TENANT_SCOPED_MODELS` array, and add `'DailyLogEntry'`, `'Activity'`, `'ActivityParticipation'` (match the exact string/format already used, e.g. alongside `'Student'`).

- [ ] **Step 4: Validate the schema (local gate)**

Run: `pnpm --filter @ecole-saas/api exec prisma format && pnpm --filter @ecole-saas/api exec prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀" (if the `prisma` CLI is blocked locally by `ERR_DLOPEN_FAILED`, skip — CI validates).

- [ ] **Step 5: 🛑 CHECKPOINT — request user approval for the migration.** Present the model diff above and the migration name `t2b_journal_activities`. **Do not generate/commit a migration until the user approves** (CLAUDE.md migration checkpoint).

- [ ] **Step 6: Generate the migration (after approval, runs in CI/dev with a DB)**

Run: `pnpm --filter @ecole-saas/api exec prisma migrate dev --name t2b_journal_activities --create-only`, then review the SQL (must be additive: `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX` only — no `ALTER`/`DROP` on existing tables), then apply.
Expected: a new folder `apps/api/prisma/migrations/<timestamp>_t2b_journal_activities/migration.sql` with only additive statements.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/src/common/prisma/tenant.extension.ts apps/api/prisma/migrations
git commit -m "feat(api): add DailyLogEntry, Activity, ActivityParticipation models (T2b PR-1)"
```

---

### Task 2: Journal DTOs

**Files:**
- Create: `apps/api/src/journal/dto/journal.dto.ts`

- [ ] **Step 1: Write the DTOs** (class-validator + Swagger; mirror `apps/api/src/subjects/dto/subject.dto.ts`)

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChildMood } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDailyLogDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) meals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) nap?: string;
  @ApiPropertyOptional({ enum: ChildMood }) @IsOptional() @IsEnum(ChildMood) mood?: ChildMood;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) bathroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) activitiesNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) generalNote?: string;
}

export class UpdateDailyLogDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) meals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) nap?: string;
  @ApiPropertyOptional({ enum: ChildMood }) @IsOptional() @IsEnum(ChildMood) mood?: ChildMood;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) bathroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) activitiesNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) generalNote?: string;
}

export class ListJournalQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional({ example: '2026-05-30' }) @IsOptional() @IsISO8601() date?: string;
}

export class DailyLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() date!: string;
  @ApiPropertyOptional() meals?: string | null;
  @ApiPropertyOptional() nap?: string | null;
  @ApiPropertyOptional({ enum: ChildMood }) mood?: ChildMood | null;
  @ApiPropertyOptional() bathroom?: string | null;
  @ApiPropertyOptional() activitiesNote?: string | null;
  @ApiPropertyOptional() generalNote?: string | null;
  @ApiProperty() authorId!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListJournalResponseDto {
  @ApiProperty({ type: [DailyLogResponseDto] }) items!: DailyLogResponseDto[];
  @ApiProperty() total!: number;
}
```

- [ ] **Step 2: Type-check** — `pnpm --filter @ecole-saas/api type-check` → Expected: PASS.
- [ ] **Step 3: Commit** — `git add apps/api/src/journal/dto && git commit -m "feat(api): add journal DTOs (T2b PR-1)"`

---

### Task 3: Journal service (+ unit spec)

**Files:**
- Create: `apps/api/src/journal/journal.service.ts`
- Create: `apps/api/src/journal/journal.service.spec.ts`

- [ ] **Step 1: Write the failing unit test** (`journal.service.spec.ts`) — mirror the mocking style of `apps/api/src/subjects/subjects.service.spec.ts`. Cover: create scopes to tenant; list as PARENT filters to owned students; getById missing → NotFound.

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JournalService } from './journal.service';

const admin = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.SCHOOL_ADMIN };
const parent = { id: 'p1', email: 'p@t.test', tenantId: 't1', role: UserRole.PARENT };

function makePrisma() {
  return {
    dailyLogEntry: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    parentStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 's1' }]) },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
  } as never;
}

describe('JournalService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: JournalService;
  beforeEach(() => {
    prisma = makePrisma();
    service = new JournalService(prisma);
  });

  it('list as PARENT restricts studentId to owned children', async () => {
    await service.list({}, parent);
    expect(prisma.parentStudent.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', parentUserId: 'p1' },
      select: { studentId: true },
    });
    const arg = prisma.dailyLogEntry.findMany.mock.calls[0][0];
    expect(arg.where.studentId).toEqual({ in: ['s1'] });
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create({ studentId: 's1', date: '2026-05-30' }, { ...admin, tenantId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getById of a missing entry throws NotFound', async () => {
    prisma.dailyLogEntry.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — Run (CI): `pnpm --filter @ecole-saas/api exec vitest run src/journal/journal.service.spec.ts` → Expected: FAIL ("Cannot find module './journal.service'").

- [ ] **Step 3: Implement `journal.service.ts`** (tenant-scoped + parent-scoped; mirror `students.service.ts`)

```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateDailyLogDto,
  DailyLogResponseDto,
  ListJournalQueryDto,
  ListJournalResponseDto,
  UpdateDailyLogDto,
} from './dto/journal.dto';

type Row = Prisma.DailyLogEntryGetPayload<{ include: { student: true } }>;

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(query: ListJournalQueryDto, user: AuthenticatedUser): Promise<ListJournalResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.DailyLogEntryWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (query.date) where.date = new Date(query.date);
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.dailyLogEntry.findMany({
        where,
        include: { student: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.dailyLogEntry.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async create(dto: CreateDailyLogDto, user: AuthenticatedUser): Promise<DailyLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.dailyLogEntry.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          studentId: dto.studentId,
          date: new Date(dto.date),
          meals: dto.meals ?? null,
          nap: dto.nap ?? null,
          mood: dto.mood ?? null,
          bathroom: dto.bathroom ?? null,
          activitiesNote: dto.activitiesNote ?? null,
          generalNote: dto.generalNote ?? null,
          authorId: user.id,
        },
        include: { student: true },
      });
      return this.toResponse(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ForbiddenException({ code: 'DAILY_LOG_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async getById(id: string, user: AuthenticatedUser): Promise<DailyLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.dailyLogEntry.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'DAILY_LOG_NOT_FOUND' });
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
    dto: UpdateDailyLogDto,
    user: AuthenticatedUser,
  ): Promise<DailyLogResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.dailyLogEntry.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'DAILY_LOG_NOT_FOUND' });
    const row = await this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        ...(dto.meals !== undefined ? { meals: dto.meals } : {}),
        ...(dto.nap !== undefined ? { nap: dto.nap } : {}),
        ...(dto.mood !== undefined ? { mood: dto.mood } : {}),
        ...(dto.bathroom !== undefined ? { bathroom: dto.bathroom } : {}),
        ...(dto.activitiesNote !== undefined ? { activitiesNote: dto.activitiesNote } : {}),
        ...(dto.generalNote !== undefined ? { generalNote: dto.generalNote } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.dailyLogEntry.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'DAILY_LOG_NOT_FOUND' });
    await this.prisma.dailyLogEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(r: Row): DailyLogResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      date: r.date.toISOString().slice(0, 10),
      meals: r.meals,
      nap: r.nap,
      mood: r.mood,
      bathroom: r.bathroom,
      activitiesNote: r.activitiesNote,
      generalNote: r.generalNote,
      authorId: r.authorId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run test, verify it passes** — Run (CI): `pnpm --filter @ecole-saas/api exec vitest run src/journal/journal.service.spec.ts` → Expected: PASS. Locally run `pnpm --filter @ecole-saas/api type-check` → PASS.
- [ ] **Step 5: Commit** — `git add apps/api/src/journal && git commit -m "feat(api): journal service with tenant+parent scoping (T2b PR-1)"`

---

### Task 4: Journal controller + module + registration

**Files:**
- Create: `apps/api/src/journal/journal.controller.ts`
- Create: `apps/api/src/journal/journal.module.ts`
- Modify: `apps/api/src/app.module.ts` (import + register `JournalModule`)

- [ ] **Step 1: Write `journal.controller.ts`** (mirror `subjects.controller.ts`; RBAC per spec §4.8: read = ADMIN/TEACHER/PARENT, write = ADMIN/TEACHER)

```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateDailyLogDto,
  DailyLogResponseDto,
  ListJournalQueryDto,
  ListJournalResponseDto,
  UpdateDailyLogDto,
} from './dto/journal.dto';
import { JournalService } from './journal.service';

/** T2b — Journal quotidien (cahier de liaison). */
@ApiTags('journal')
@ApiBearerAuth()
@Controller('journal')
export class JournalController {
  constructor(private readonly service: JournalService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'List daily log entries (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListJournalQueryDto,
  ): Promise<ListJournalResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<DailyLogResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDailyLogDto,
  ): Promise<DailyLogResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogDto,
  ): Promise<DailyLogResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
```

- [ ] **Step 2: Write `journal.module.ts`** (mirror `subjects.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

@Module({ controllers: [JournalController], providers: [JournalService] })
export class JournalModule {}
```

- [ ] **Step 3: Register in `app.module.ts`** — add `import { JournalModule } from './journal/journal.module';` and add `JournalModule` to the `imports` array (next to `SubjectsModule`).

- [ ] **Step 4: Type-check** — `pnpm --filter @ecole-saas/api type-check` → Expected: PASS.
- [ ] **Step 5: Commit** — `git add apps/api/src/journal apps/api/src/app.module.ts && git commit -m "feat(api): journal controller + module (T2b PR-1)"`

---

### Task 5: Activités DTOs

**Files:**
- Create: `apps/api/src/activities/dto/activity.dto.ts`

- [ ] **Step 1: Write the DTOs**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityCategory } from '@prisma/client';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ enum: ActivityCategory }) @IsOptional() @IsEnum(ActivityCategory) category?: ActivityCategory;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1440 }) @IsOptional() @IsInt() @Min(1) @Max(1440) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) location?: string;
}

export class UpdateActivityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ enum: ActivityCategory }) @IsOptional() @IsEnum(ActivityCategory) category?: ActivityCategory;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1440 }) @IsOptional() @IsInt() @Min(1) @Max(1440) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) location?: string;
}

export class AddParticipationDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
}

export class ParticipationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
}

export class ActivityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty({ enum: ActivityCategory }) category!: ActivityCategory;
  @ApiPropertyOptional() scheduledAt?: string | null;
  @ApiPropertyOptional() durationMin?: number | null;
  @ApiPropertyOptional() location?: string | null;
  @ApiProperty() participantCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListActivitiesResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] }) items!: ActivityResponseDto[];
  @ApiProperty() total!: number;
}
```

- [ ] **Step 2: Type-check** → PASS. **Step 3: Commit** — `git add apps/api/src/activities/dto && git commit -m "feat(api): activities DTOs (T2b PR-1)"`

---

### Task 6: Activités service (+ unit spec)

**Files:**
- Create: `apps/api/src/activities/activities.service.ts`
- Create: `apps/api/src/activities/activities.service.spec.ts`

- [ ] **Step 1: Write the failing unit test** — cover: create throws without tenant; `addParticipation` validates the student belongs to the tenant.

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivitiesService } from './activities.service';

const admin = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.SCHOOL_ADMIN };

function makePrisma() {
  return {
    activity: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activityParticipation: {
      create: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    student: { findFirst: vi.fn().mockResolvedValue({ id: 's1', firstName: 'A', lastName: 'B' }) },
  } as never;
}

describe('ActivitiesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ActivitiesService;
  beforeEach(() => {
    prisma = makePrisma();
    service = new ActivitiesService(prisma);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(service.create({ name: 'Chorale' }, { ...admin, tenantId: null }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('addParticipation throws NotFound when the student is not in the tenant', async () => {
    prisma.activity.findFirst.mockResolvedValueOnce({ id: 'a1', tenantId: 't1' });
    prisma.student.findFirst.mockResolvedValueOnce(null);
    await expect(service.addParticipation('a1', { studentId: 'x' }, admin))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test, verify it fails** — Run (CI): `pnpm --filter @ecole-saas/api exec vitest run src/activities/activities.service.spec.ts` → FAIL ("Cannot find module './activities.service'").

- [ ] **Step 3: Implement `activities.service.ts`**

```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  ActivityResponseDto,
  AddParticipationDto,
  CreateActivityDto,
  ListActivitiesResponseDto,
  ParticipationResponseDto,
  UpdateActivityDto,
} from './dto/activity.dto';

type ActivityRow = Prisma.ActivityGetPayload<{ include: { _count: { select: { participations: true } } } }>;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<ListActivitiesResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.ActivityWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: { _count: { select: { participations: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async create(dto: CreateActivityDto, user: AuthenticatedUser): Promise<ActivityResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.activity.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        name: dto.name.trim(),
        description: dto.description ?? null,
        category: dto.category ?? 'OTHER',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        durationMin: dto.durationMin ?? null,
        location: dto.location ?? null,
      },
      include: { _count: { select: { participations: true } } },
    });
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateActivityDto, user: AuthenticatedUser): Promise<ActivityResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.activity.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    const row = await this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null } : {}),
        ...(dto.durationMin !== undefined ? { durationMin: dto.durationMin } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
      },
      include: { _count: { select: { participations: true } } },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.activity.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    await this.prisma.activity.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async listParticipations(activityId: string, user: AuthenticatedUser): Promise<ParticipationResponseDto[]> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!activity) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    const where: Prisma.ActivityParticipationWhereInput = { tenantId: user.tenantId, activityId };
    if (user.role === 'PARENT') {
      const owned = await this.prisma.parentStudent.findMany({
        where: { tenantId: user.tenantId, parentUserId: user.id },
        select: { studentId: true },
      });
      where.studentId = { in: owned.map((o) => o.studentId) };
    }
    const rows = await this.prisma.activityParticipation.findMany({ where, include: { student: true } });
    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
    }));
  }

  async addParticipation(
    activityId: string,
    dto: AddParticipationDto,
    user: AuthenticatedUser,
  ): Promise<ParticipationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!activity) throw new NotFoundException({ code: 'ACTIVITY_NOT_FOUND' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.activityParticipation.create({
        data: { id: createId(), tenantId: user.tenantId, activityId, studentId: dto.studentId },
      });
      return {
        id: row.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ForbiddenException({ code: 'PARTICIPATION_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async removeParticipation(activityId: string, studentId: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const res = await this.prisma.activityParticipation.deleteMany({
      where: { tenantId: user.tenantId, activityId, studentId },
    });
    if (res.count === 0) throw new NotFoundException({ code: 'PARTICIPATION_NOT_FOUND' });
  }

  private toResponse(r: ActivityRow): ActivityResponseDto {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
      durationMin: r.durationMin,
      location: r.location,
      participantCount: r._count.participations,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run test, verify it passes** — Run (CI): `pnpm --filter @ecole-saas/api exec vitest run src/activities/activities.service.spec.ts` → PASS. Locally: `pnpm --filter @ecole-saas/api type-check` → PASS.
- [ ] **Step 5: Commit** — `git add apps/api/src/activities && git commit -m "feat(api): activities service with participations (T2b PR-1)"`

---

### Task 7: Activités controller + module + registration

**Files:**
- Create: `apps/api/src/activities/activities.controller.ts`
- Create: `apps/api/src/activities/activities.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write `activities.controller.ts`**

```typescript
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ActivityResponseDto,
  AddParticipationDto,
  CreateActivityDto,
  ListActivitiesResponseDto,
  ParticipationResponseDto,
  UpdateActivityDto,
} from './dto/activity.dto';
import { ActivitiesService } from './activities.service';

/** T2b — Activités périscolaires + participations. */
@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'List the activity catalogue (with participant counts)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListActivitiesResponseDto> {
    return this.service.list(user);
  }

  @Get(':id/participations')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  participations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ParticipationResponseDto[]> {
    return this.service.listParticipations(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActivityDto): Promise<ActivityResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }

  @Post(':id/participations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  addParticipation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddParticipationDto,
  ): Promise<ParticipationResponseDto> {
    return this.service.addParticipation(id, dto, user);
  }

  @Delete(':id/participations/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  removeParticipation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    return this.service.removeParticipation(id, studentId, user);
  }
}
```

- [ ] **Step 2: Write `activities.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({ controllers: [ActivitiesController], providers: [ActivitiesService] })
export class ActivitiesModule {}
```

- [ ] **Step 3: Register in `app.module.ts`** — `import { ActivitiesModule } from './activities/activities.module';` + add `ActivitiesModule` to `imports`.
- [ ] **Step 4: Type-check** → PASS. **Step 5: Commit** — `git add apps/api/src/activities apps/api/src/app.module.ts && git commit -m "feat(api): activities controller + module (T2b PR-1)"`

---

### Task 8: Web proxies (journal + activities)

**Files:**
- Create: `apps/web/app/api/journal/[[...action]]/route.ts`
- Create: `apps/web/app/api/activities/[[...action]]/route.ts`

- [ ] **Step 1: Create the journal proxy** — copy `apps/web/app/api/students/[[...action]]/route.ts` verbatim, replacing the two `students` occurrences (the JSDoc and `targetUrl`'s `/api/students`) with `journal`. Final `targetUrl`: `` `${API_URL}/api/journal${suffix}${url.search}` ``.
- [ ] **Step 2: Create the activities proxy** — same copy, replacing `students` → `activities`; `targetUrl`: `` `${API_URL}/api/activities${suffix}${url.search}` ``.
- [ ] **Step 3: Type-check** — `pnpm --filter web type-check` → PASS.
- [ ] **Step 4: Commit** — `git add apps/web/app/api/journal apps/web/app/api/activities && git commit -m "feat(web): journal + activities API proxies (T2b PR-1)"`

---

### Task 9: Web API clients + Zod schemas

**Files:**
- Create: `apps/web/lib/api/journal.ts`
- Create: `apps/web/lib/api/activities.ts`
- Create: `apps/web/lib/validation/journal.schemas.ts`
- Create: `apps/web/lib/validation/activities.schemas.ts`

- [ ] **Step 1: `journal.ts`** (mirror `apps/web/lib/api/staff.ts`)

```typescript
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type ChildMood = 'HAPPY' | 'CALM' | 'TIRED' | 'UPSET' | 'SICK';

export interface DailyLog {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  meals: string | null;
  nap: string | null;
  mood: ChildMood | null;
  bathroom: string | null;
  activitiesNote: string | null;
  generalNote: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}
export interface ListJournalResponse {
  items: DailyLog[];
  total: number;
}
export interface CreateDailyLogInput {
  studentId: string;
  date: string;
  meals?: string;
  nap?: string;
  mood?: ChildMood;
  bathroom?: string;
  activitiesNote?: string;
  generalNote?: string;
}
export type UpdateDailyLogInput = Omit<Partial<CreateDailyLogInput>, 'studentId' | 'date'>;

const BASE = '/api/journal';
export const listJournal = (token: string) => apiGet<ListJournalResponse>(BASE, token);
export const createDailyLog = (token: string, input: CreateDailyLogInput) =>
  apiPost<DailyLog>(BASE, token, input);
export const updateDailyLog = (token: string, id: string, input: UpdateDailyLogInput) =>
  apiPatch<DailyLog>(`${BASE}/${id}`, token, input);
export const deleteDailyLog = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);
```

- [ ] **Step 2: `activities.ts`**

```typescript
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api/http';

export type ActivityCategory = 'ART' | 'MUSIC' | 'SPORT' | 'OUTING' | 'OTHER';

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: ActivityCategory;
  scheduledAt: string | null;
  durationMin: number | null;
  location: string | null;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface ListActivitiesResponse {
  items: Activity[];
  total: number;
}
export interface CreateActivityInput {
  name: string;
  description?: string;
  category?: ActivityCategory;
  scheduledAt?: string;
  durationMin?: number;
  location?: string;
}
export type UpdateActivityInput = Partial<CreateActivityInput>;

const BASE = '/api/activities';
export const listActivities = (token: string) => apiGet<ListActivitiesResponse>(BASE, token);
export const createActivity = (token: string, input: CreateActivityInput) =>
  apiPost<Activity>(BASE, token, input);
export const updateActivity = (token: string, id: string, input: UpdateActivityInput) =>
  apiPatch<Activity>(`${BASE}/${id}`, token, input);
export const deleteActivity = (token: string, id: string) => apiDelete(`${BASE}/${id}`, token);
```

- [ ] **Step 3: `journal.schemas.ts`** (mirror `lib/validation/staff.schemas.ts`)

```typescript
import { z } from 'zod';

export const MOODS = ['HAPPY', 'CALM', 'TIRED', 'UPSET', 'SICK'] as const;

export const createDailyLogSchema = z.object({
  studentId: z.string().min(1, 'Élève requis'),
  date: z.string().min(1, 'Date requise'),
  meals: z.string().max(200).optional(),
  nap: z.string().max(200).optional(),
  mood: z.enum(MOODS).optional(),
  bathroom: z.string().max(200).optional(),
  activitiesNote: z.string().max(2000).optional(),
  generalNote: z.string().max(2000).optional(),
});
export type CreateDailyLogValues = z.infer<typeof createDailyLogSchema>;
```

- [ ] **Step 4: `activities.schemas.ts`**

```typescript
import { z } from 'zod';

export const CATEGORIES = ['ART', 'MUSIC', 'SPORT', 'OUTING', 'OTHER'] as const;

export const activitySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(160),
  description: z.string().max(2000).optional(),
  category: z.enum(CATEGORIES).optional(),
  scheduledAt: z.string().optional(),
  durationMin: z.coerce.number().int().min(1).max(1440).optional(),
  location: z.string().max(160).optional(),
});
export type ActivityValues = z.infer<typeof activitySchema>;
```

- [ ] **Step 5: Type-check** — `pnpm --filter web type-check` → PASS. **Step 6: Commit** — `git add apps/web/lib/api/journal.ts apps/web/lib/api/activities.ts apps/web/lib/validation/journal.schemas.ts apps/web/lib/validation/activities.schemas.ts && git commit -m "feat(web): journal + activities API clients and schemas (T2b PR-1)"`

---

### Task 10: Journal page rewrite (real data, role-adapted)

**Files:**
- Create: `apps/web/components/crud/daily-log-form.tsx`
- Modify (full rewrite): `apps/web/app/[locale]/(app)/journal/page.tsx`

- [ ] **Step 1: Write `daily-log-form.tsx`** (mirror `apps/web/components/crud/staff-form.tsx`: react-hook-form + `zodResolver(createDailyLogSchema)`; fields: `studentId` (text input — a student picker is deferred), `date` (`type="date"`), `mood` (`<select>` over `MOODS`), `meals`, `nap`, `generalNote`). Export `DailyLogForm({ submitLabel, pending, onSubmit, onCancel }: { submitLabel: string; pending: boolean; onSubmit: (v: CreateDailyLogValues) => void; onCancel: () => void })`.

- [ ] **Step 2: Rewrite `journal/page.tsx`** — delete the hardcoded `JOURNAL_ENTRIES`. Keep `MOOD_CONFIG` but re-key it to the API enum (`HAPPY/CALM/TIRED/UPSET/SICK`). Mirror `apps/web/app/[locale]/(app)/teachers/page.tsx`:

```typescript
'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { requireToken } from '@/lib/auth/require-token';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/lib/ui/use-toast';
import { Button } from '@/components/ui/button';
import { CrudModal } from '@/components/crud/crud-modal';
import { ResourceListPage } from '@/components/crud/resource-list-page';
import { DailyLogForm } from '@/components/crud/daily-log-form';
import { listJournal, createDailyLog } from '@/lib/api/journal';
import type { CreateDailyLogValues } from '@/lib/validation/journal.schemas';

const JOURNAL_KEY = ['journal', 'list'] as const;
// MOOD_CONFIG keyed on ChildMood (HAPPY/CALM/TIRED/UPSET/SICK) — keep the card visuals.

export default function JournalPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isContributor = user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER';
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useResource(JOURNAL_KEY, listJournal);
  const entries = data?.items ?? [];
  const [createOpen, setCreateOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: (v: CreateDailyLogValues) => createDailyLog(requireToken(accessToken), v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      setCreateOpen(false);
      toast.success('Entrée ajoutée.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Création impossible.'),
  });

  return (
    <>
      <ResourceListPage
        title="Journal quotidien"
        description="Activités et observations au fil des jours."
        action={isContributor ? <Button onClick={() => setCreateOpen(true)}>Ajouter une entrée</Button> : undefined}
        isLoading={isLoading}
        isError={isError}
        isEmpty={entries.length === 0}
        onRetry={refetch}
        errorMessage="Impossible de charger le journal."
        emptyTitle="Aucune entrée de journal"
        emptyDescription="Les observations quotidiennes apparaîtront ici."
        skeletonCols={3}
      >
        {/* Render entries grouped by `date` as cards (reuse the existing visual style + MOOD_CONFIG). */}
      </ResourceListPage>
      <CrudModal open={createOpen} title="Nouvelle entrée" onClose={() => setCreateOpen(false)}>
        <DailyLogForm
          submitLabel="Créer"
          pending={createMut.isPending}
          onSubmit={(v) => createMut.mutate(v)}
          onCancel={() => setCreateOpen(false)}
        />
      </CrudModal>
    </>
  );
}
```

- [ ] **Step 3: Type-check + lint** — `pnpm --filter web type-check && pnpm --filter web lint` → PASS (escape any apostrophes in JSX text as `&apos;`).
- [ ] **Step 4: Commit** — `git add apps/web/components/crud/daily-log-form.tsx "apps/web/app/[locale]/(app)/journal/page.tsx" && git commit -m "feat(web): journal page on real data (T2b PR-1)"`

---

### Task 11: Activités page rewrite (real data, role-adapted)

**Files:**
- Create: `apps/web/components/crud/activity-form.tsx`
- Modify (full rewrite): `apps/web/app/[locale]/(app)/activities/page.tsx`

- [ ] **Step 1: Write `activity-form.tsx`** (mirror `staff-form.tsx`; fields: `name`, `category` (`<select>` over `CATEGORIES`), `description`, `scheduledAt` (`type="datetime-local"`), `durationMin` (`type="number"`), `location`; `zodResolver(activitySchema)`). Export `ActivityForm({ defaultValues, submitLabel, pending, onSubmit, onCancel }: { defaultValues?: Partial<ActivityValues>; submitLabel: string; pending: boolean; onSubmit: (v: ActivityValues) => void; onCancel: () => void })` — usable for create and edit.

- [ ] **Step 2: Rewrite `activities/page.tsx`** — delete the hardcoded `ACTIVITIES`. Re-key `CATEGORY_CONFIG` to the API enum (`ART/MUSIC/SPORT/OUTING/OTHER`). `useResource(['activities','list'], listActivities)`; render cards grouped by `category` (keep visuals; show `participantCount` instead of the demo `enrolled/max` bar); role-gated create/edit/delete (SCHOOL_ADMIN/TEACHER) via `CrudModal` + `ActivityForm` + `useMutation` (`createActivity`/`updateActivity`/`deleteActivity`) + toast + `invalidateQueries(['activities','list'])`. Empty state: "Aucune activité".

- [ ] **Step 3: Type-check + lint** → PASS. **Step 4: Commit** — `git add apps/web/components/crud/activity-form.tsx "apps/web/app/[locale]/(app)/activities/page.tsx" && git commit -m "feat(web): activities page on real data (T2b PR-1)"`

---

### Task 12: Seed fixtures (idempotent)

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add idempotent seed helpers** — for each demo tenant, fetch the SCHOOL_ADMIN (author) and a few existing students, then create journal entries + activities + participations guarded against re-runs. Use a fixed date — do NOT use `Date.now()`/`new Date()` without an argument.

```typescript
// inside the per-tenant seed loop (after students + admin exist):
const author = await prisma.user.findFirst({ where: { tenantId, role: 'SCHOOL_ADMIN' } });
const someStudents = await prisma.student.findMany({ where: { tenantId, deletedAt: null }, take: 3 });
if (author && someStudents.length > 0) {
  for (const s of someStudents) {
    await prisma.dailyLogEntry.upsert({
      where: { unique_daily_log_per_day: { tenantId, studentId: s.id, date: new Date('2026-05-29') } },
      update: {},
      create: {
        id: createId(), tenantId, studentId: s.id, date: new Date('2026-05-29'),
        meals: 'A bien mangé', nap: 'Sieste 13h-14h30', mood: 'HAPPY',
        generalNote: 'Belle journée.', authorId: author.id,
      },
    });
  }
  const seedActivities = [
    { name: 'Chorale', category: 'MUSIC' as const },
    { name: 'Club Sciences', category: 'SPORT' as const },
    { name: 'Atelier Peinture', category: 'ART' as const },
  ];
  for (const a of seedActivities) {
    const existing = await prisma.activity.findFirst({ where: { tenantId, name: a.name } });
    const activity = existing ?? (await prisma.activity.create({
      data: { id: createId(), tenantId, name: a.name, category: a.category },
    }));
    await prisma.activityParticipation.upsert({
      where: { unique_participation: { activityId: activity.id, studentId: someStudents[0].id } },
      update: {},
      create: { id: createId(), tenantId, activityId: activity.id, studentId: someStudents[0].id },
    });
  }
}
```

- [ ] **Step 2: Type-check** — `pnpm --filter @ecole-saas/api type-check` → PASS. (Seed runs in CI/dev: `pnpm --filter @ecole-saas/api exec prisma db seed`.)
- [ ] **Step 3: Commit** — `git add apps/api/prisma/seed.ts && git commit -m "feat(api): seed journal + activities fixtures (idempotent, T2b PR-1)"`

---

### Task 13: E2E — RBAC + persistence + isolation (journal & activities)

**Files:**
- Create: `apps/api/test/journal.e2e-spec.ts`
- Create: `apps/api/test/activities.e2e-spec.ts`
- Modify: `apps/api/test/multi-tenant-isolation.e2e-spec.ts` (extend for the 3 new models)

- [ ] **Step 1: Write `journal.e2e-spec.ts`** — bootstrap the app like `apps/api/test/students.e2e-spec.ts`. Seed tenant A with a SCHOOL_ADMIN, a TEACHER, a PARENT linked to `studentA1` via `ParentStudent`, and a second student `studentA2` (not linked to the parent). Assert:
  - `POST /journal` (for `studentA1`) as TEACHER → 201; as PARENT → 403.
  - `GET /journal` as PARENT → returns only entries for `studentA1` (not `studentA2`).
  - `GET /journal/:id` for a `studentA2` entry as PARENT → 403 with `code: 'STUDENT_NOT_OWNED_BY_PARENT'`.
  - Persistence: create → `GET /journal` includes the new entry.

- [ ] **Step 2: Write `activities.e2e-spec.ts`** — assert: `POST /activities` as TEACHER → 201, as PARENT → 403; `GET /activities` as PARENT → 200 (catalogue visible); `POST /activities/:id/participations` twice for the same student → second is 403 (`PARTICIPATION_ALREADY_EXISTS`); `GET /activities/:id/participations` as PARENT → only their own children.

- [ ] **Step 3: Extend `multi-tenant-isolation.e2e-spec.ts`** — following the existing "Student isolation" block (around lines 248-306), in `beforeEach` seed one `Activity` (+ one `DailyLogEntry` referencing the per-tenant student) per tenant, then add tests proving `tenantPrisma.client.dailyLogEntry.findMany()` and `tenantPrisma.client.activity.findMany()` return only the current-tenant rows, and `findFirst({ where: { id: <tenantB id> } })` from tenant A context returns `null`.

- [ ] **Step 4: Run e2e (CI)** — `pnpm --filter @ecole-saas/api exec vitest run --config vitest.e2e.config.ts` → Expected: PASS. Locally only `type-check`.
- [ ] **Step 5: Commit** — `git add apps/api/test && git commit -m "test(api): e2e RBAC + isolation for journal + activities (T2b PR-1)"`

---

### Task 14: Verify, open PR, auto-merge on green

- [ ] **Step 1: Full local gate** — `pnpm --filter @ecole-saas/api type-check && pnpm --filter web type-check && pnpm lint` → Expected: all PASS, zero lint warnings.
- [ ] **Step 2: Push** — `git push -u origin feat/t2b-operational-modules`.
- [ ] **Step 3: Open PR** — `gh pr create --base main --head feat/t2b-operational-modules --title "feat(t2b): PR-1 Journal + Activités (real persisted modules)" --body "<summary + test plan>"`. Body must include: the new models, the RBAC matrix, the migration name `t2b_journal_activities`, and "Part of the T2b umbrella spec".
- [ ] **Step 4: Watch CI** — `gh pr checks <N> --watch` (build + unit + e2e + GitGuardian + Vercel).
- [ ] **Step 5: Auto-merge on green** — when all checks pass: `gh pr merge <N> --merge` (merge commit, no `Co-Authored-By`). Then STOP and report; do not start PR-2 without user validation.

---

## Self-review (against the spec)

- **Spec §4.5 (DailyLogEntry) / §4.6 (Activity + ActivityParticipation):** Task 1 ✓ (fields, enums, `@@unique`, indexes, `@@map`).
- **Spec §4.8 RBAC (Journal/Activités rows):** Tasks 4 & 7 ✓ (read = ADMIN/TEACHER/PARENT; write = ADMIN/TEACHER; STAFF excluded).
- **Spec §5.6 parent-scoped reads (`STUDENT_NOT_OWNED_BY_PARENT`):** Tasks 3 & 6 ✓, tested in Task 13.
- **Spec §5.3 web (no hardcoded data, loading/empty/error, role-adapted):** Tasks 10 & 11 ✓.
- **Spec §5.4 mobile read:** out of this plan (web only); the mobile read surface is handled in a later mobile task — noted, not silently dropped.
- **Spec §7 tests (RBAC 200/403, persistence, isolation tenant + parent):** Task 13 ✓.
- **Spec §10 migration checkpoint:** Task 1 Step 5 🛑 ✓.
- **Spec §5.7 notifications:** Journal notification is explicitly out-of-lot per §5.7 — correctly omitted here.
- **Type consistency:** query keys (`['journal','list']`, `['activities','list']`), `ChildMood`/`ActivityCategory` enums, and `participantCount` are used identically across API client, page, and tests.

## Notes for the next plans (same gabarit)
PR-2 (Discipline + Santé, incl. notification fanout + RGPD), PR-3 (Cantine + Transport), PR-4 (Sécurité) each get their own plan reusing Tasks 1–14 as the template.
