# V6 — Pédagogie + Bulletins PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add academic gradebook (subjects, periods, evaluations, grades) and per-student/period PDF bulletin generation to Klasso, restricted to teachers (grade entry) and school admins (bulletin issuance).

**Architecture:** Five new Prisma models (`Subject`, `GradePeriod`, `Evaluation`, `Grade`, `Bulletin`) follow the existing multi-tenant pattern (`tenantId` on every row). Four NestJS modules (`subjects`, `grade-periods`, `evaluations`, `bulletins`) reuse the auth/roles/Prisma plumbing already in place. PDF rendering is done server-side with `@react-pdf/renderer` (D32 lock) — the rendered buffer is streamed back to the browser via a `POST /bulletins/generate` endpoint and a snapshot of the computed data is stored on the `Bulletin` row so re-prints are deterministic.

**Tech Stack:**
- Backend: NestJS 10 + Prisma 5 + class-validator + `@paralleldrive/cuid2` + `@react-pdf/renderer` ^4.x
- Frontend: Next.js 14 App Router + TanStack Query + react-hook-form + zod + Tailwind/shadcn
- Tests: Vitest unit tests next to services (`*.service.spec.ts`)

**Base commit:** `83d3277` (main, after V4 merge).

**Locked decisions (D32):**
- PDF rendering = `@react-pdf/renderer` (server-side, JSX-like, ~200KB, runs on Railway/Vercel)

**Out-of-scope V6 (deferred to V6-B / V9):**
- Weighted averages per subject (V6-B)
- Teacher textual comments on bulletin (V6-B)
- Parent notifications when a bulletin is published (V9)
- Parent / student personas read access to grades + bulletin download (V6-B; V6 ships ADMIN + TEACHER UI only)
- Coefficient field on `Evaluation` (V6-B — V6 uses simple arithmetic mean)
- `Student.classId` FK migration from string `classroom` (still V4-B). V6 matches students to classes by `student.classroom == class.name` within the same `tenantId`.

---

## File Structure (~30 files)

### Prisma (3 files touched/created)
- **Modify:** `apps/api/prisma/schema.prisma` — add 5 models + relations on Tenant/User/Student/Class
- **Create:** `apps/api/prisma/migrations/<timestamp>_v6_pedagogy_bulletins/migration.sql` (Prisma auto-generates)
- **Modify:** `apps/api/prisma/seed.ts` — seed 6 subjects + 3 grade periods per demo tenant

### API — Subjects module (5 files)
- `apps/api/src/subjects/subjects.module.ts`
- `apps/api/src/subjects/subjects.controller.ts`
- `apps/api/src/subjects/subjects.service.ts`
- `apps/api/src/subjects/dto/subject.dto.ts`
- `apps/api/src/subjects/subjects.service.spec.ts`

### API — Grade Periods module (5 files)
- `apps/api/src/grade-periods/grade-periods.module.ts`
- `apps/api/src/grade-periods/grade-periods.controller.ts`
- `apps/api/src/grade-periods/grade-periods.service.ts`
- `apps/api/src/grade-periods/dto/grade-period.dto.ts`
- `apps/api/src/grade-periods/grade-periods.service.spec.ts`

### API — Evaluations + Grades module (5 files)
- `apps/api/src/evaluations/evaluations.module.ts`
- `apps/api/src/evaluations/evaluations.controller.ts`
- `apps/api/src/evaluations/evaluations.service.ts`
- `apps/api/src/evaluations/dto/evaluation.dto.ts`
- `apps/api/src/evaluations/evaluations.service.spec.ts`

### API — Bulletins module (7 files)
- `apps/api/src/bulletins/bulletins.module.ts`
- `apps/api/src/bulletins/bulletins.controller.ts`
- `apps/api/src/bulletins/bulletins.service.ts`
- `apps/api/src/bulletins/bulletin-pdf.service.ts`
- `apps/api/src/bulletins/templates/bulletin-document.tsx`
- `apps/api/src/bulletins/dto/bulletin.dto.ts`
- `apps/api/src/bulletins/bulletins.service.spec.ts`

### API — wiring (2 files)
- **Modify:** `apps/api/src/app.module.ts` — register the 4 new modules
- **Modify:** `apps/api/package.json` — add `@react-pdf/renderer` dep

### Web — proxies (4 files)
- `apps/web/app/api/subjects/[...action]/route.ts`
- `apps/web/app/api/grade-periods/[...action]/route.ts`
- `apps/web/app/api/evaluations/[...action]/route.ts`
- `apps/web/app/api/bulletins/[...action]/route.ts`

### Web — pages (4 files)
- `apps/web/app/[locale]/(app)/classes/[id]/grades/page.tsx`
- `apps/web/app/[locale]/(app)/classes/[id]/grades/grades-client.tsx`
- `apps/web/app/[locale]/(app)/students/[id]/bulletin/page.tsx`
- `apps/web/app/[locale]/(app)/students/[id]/bulletin/bulletin-client.tsx`

### Docs (2 files touched)
- `docs/adr/0012-v6-pedagogy-bulletins.md` (create)
- `docs/roadmap.md` (modify — add V6 row)

**Total: ~30 files.**

---

## Domain rules (lock these before coding)

**Subject** — per tenant, named matière (e.g. "Mathématiques", "Français"). Soft-deleted via `deletedAt`.

**GradePeriod** — per tenant trimester / semester. Unique on `(tenantId, schoolYear, name)`. `isClosed=true` freezes grade edits (V6: enforced on POST/PATCH /grades; bulletin generation possible regardless).

**Evaluation** — one assessment of one subject in one class for one period (e.g. "Contrôle 12 mars"). Belongs to a Class + Subject + GradePeriod. Created by a TEACHER assigned to that class, or by SCHOOL_ADMIN. No coefficient in V6.

**Grade** — one student's score on one evaluation. `score ∈ [0, evaluation.maxScore]`. Unique on `(evaluationId, studentId)`. Editable until `gradePeriod.isClosed=true`.

**Bulletin** — snapshot of all evaluations of a student in a given period. Computed averages:
- Per subject = arithmetic mean of `(score / maxScore) * 20` over all student grades for that subject in the period (only evaluations the student has a grade for)
- Overall = arithmetic mean of the per-subject averages
- All values rounded to 2 decimals on display, full precision in DB
- A student with zero grades for the period → bulletin generates with empty subjects array and `overallAverage = null` (page warns the user)
- Snapshot stored as `Bulletin.data` JSON so the PDF re-renders identically post-grade-edit

**Students-to-class matching (V6 only):** A student "belongs" to a class iff `student.tenantId == class.tenantId && student.classroom == class.name && student.deletedAt IS NULL`. Documented in ADR 0012. Replaced by `Student.classId` FK in V4-B.

**Authorization matrix:**

| Endpoint | SUPER_ADMIN | SCHOOL_ADMIN | TEACHER | STAFF | PARENT |
|---|---|---|---|---|---|
| `* /subjects/*` | ✗ (V11) | RW | R | R | ✗ |
| `* /grade-periods/*` | ✗ | RW | R | R | ✗ |
| `* /evaluations/*` (own classes for TEACHER) | ✗ | RW | RW (own classes) | R | ✗ |
| `* /grades/*` | ✗ | RW | RW (own classes) | R | ✗ |
| `POST /bulletins/generate` | ✗ | RW | ✗ | ✗ | ✗ |
| `GET  /bulletins/.../latest` | ✗ | R | R | R | ✗ |

"R" = read. "RW" = read + write. "Own classes for TEACHER" = the teacher has a `ClassTeacher` row for that class (any subject).

---

## Task 1: Add Prisma models for V6 + generate migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Append the 5 new models to the schema**

Add the following block at the bottom of `apps/api/prisma/schema.prisma` (after the `TimeSlot` model):

```prisma
// ============================================================================
// V6 — Pédagogie + Bulletins
// ============================================================================

model Subject {
  id        String    @id
  tenantId  String
  name      String
  code      String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  evaluations Evaluation[]

  @@unique([tenantId, name], name: "unique_subject_per_tenant")
  @@index([tenantId])
  @@map("subjects")
}

model GradePeriod {
  id         String    @id
  tenantId   String
  name       String
  schoolYear String
  startDate  DateTime  @db.Date
  endDate    DateTime  @db.Date
  isClosed   Boolean   @default(false)
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  evaluations Evaluation[]
  bulletins   Bulletin[]

  @@unique([tenantId, schoolYear, name], name: "unique_period_per_year")
  @@index([tenantId, schoolYear])
  @@map("grade_periods")
}

model Evaluation {
  id            String   @id
  tenantId      String
  classId       String
  subjectId     String
  gradePeriodId String
  title         String
  date          DateTime @db.Date
  maxScore      Float
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  class       Class       @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject     Subject     @relation(fields: [subjectId], references: [id], onDelete: Restrict)
  gradePeriod GradePeriod @relation(fields: [gradePeriodId], references: [id], onDelete: Restrict)
  createdBy   User        @relation("EvaluationsCreated", fields: [createdById], references: [id], onDelete: Cascade)
  grades      Grade[]

  @@index([tenantId])
  @@index([classId, gradePeriodId])
  @@index([subjectId])
  @@map("evaluations")
}

model Grade {
  id           String   @id
  tenantId     String
  evaluationId String
  studentId    String
  score        Float
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  tenant     Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  evaluation Evaluation @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  student    Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([evaluationId, studentId], name: "unique_grade_per_eval_student")
  @@index([tenantId])
  @@index([studentId])
  @@map("grades")
}

model Bulletin {
  id            String   @id
  tenantId      String
  studentId     String
  gradePeriodId String
  data          Json
  pdfUrl        String?
  generatedById String
  generatedAt   DateTime @default(now())

  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  student     Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  gradePeriod GradePeriod @relation(fields: [gradePeriodId], references: [id], onDelete: Restrict)
  generatedBy User        @relation("BulletinsGenerated", fields: [generatedById], references: [id], onDelete: Cascade)

  @@unique([studentId, gradePeriodId], name: "unique_bulletin_per_student_period")
  @@index([tenantId])
  @@index([gradePeriodId])
  @@map("bulletins")
}
```

- [ ] **Step 2: Add back-references on existing models**

In `Tenant`, add to the relations block:

```prisma
  subjects     Subject[]      // V6
  gradePeriods GradePeriod[]  // V6
  evaluations  Evaluation[]   // V6
  grades       Grade[]        // V6
  bulletins    Bulletin[]     // V6
```

In `User`:

```prisma
  evaluationsCreated Evaluation[] @relation("EvaluationsCreated") // V6
  bulletinsGenerated Bulletin[]   @relation("BulletinsGenerated") // V6
```

In `Student`, after the existing `parentRelations` field:

```prisma
  grades    Grade[]    // V6
  bulletins Bulletin[] // V6
```

In `Class`, after `timeSlots`:

```prisma
  evaluations Evaluation[] // V6
```

- [ ] **Step 3: Generate migration**

```bash
cd apps/api
pnpm prisma migrate dev --name v6_pedagogy_bulletins --create-only
```

Expected: `apps/api/prisma/migrations/<timestamp>_v6_pedagogy_bulletins/migration.sql` created. Open and sanity-check it contains `CREATE TABLE "subjects"`, `"grade_periods"`, `"evaluations"`, `"grades"`, `"bulletins"`.

- [ ] **Step 4: Apply the migration locally**

```bash
pnpm prisma migrate dev
```

Expected: "Database is now in sync with your schema." and `prisma generate` succeeds.

- [ ] **Step 5: Type-check downstream**

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: PASS — Prisma client now exposes `prisma.subject`, `prisma.gradePeriod`, etc.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(v6): Prisma models for Subject/GradePeriod/Evaluation/Grade/Bulletin"
```

---

## Task 2: Seed demo subjects + grade periods

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Inspect the current seed structure**

Read `apps/api/prisma/seed.ts` and locate where each demo tenant is created. Identify the variable holding `tenant.id` for each demo tenant (kindergarten + primary).

- [ ] **Step 2: Add a helper that seeds V6 resources for one tenant**

Append the following function near the end of `apps/api/prisma/seed.ts` (above the `main()` invocation):

```typescript
async function seedV6ForTenant(tenantId: string, schoolYear: string) {
  const subjects = [
    { name: 'Mathématiques', code: 'MATH' },
    { name: 'Français', code: 'FR' },
    { name: 'Sciences', code: 'SCI' },
    { name: 'Histoire-Géographie', code: 'HG' },
    { name: 'Anglais', code: 'EN' },
    { name: 'Éducation Physique', code: 'EPS' },
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { unique_subject_per_tenant: { tenantId, name: s.name } },
      update: {},
      create: { id: createId(), tenantId, name: s.name, code: s.code },
    });
  }

  const [y1, y2] = schoolYear.split('-');
  const periods = [
    { name: 'T1', startDate: new Date(`${y1}-09-01`), endDate: new Date(`${y1}-12-15`) },
    { name: 'T2', startDate: new Date(`${y2}-01-05`), endDate: new Date(`${y2}-03-31`) },
    { name: 'T3', startDate: new Date(`${y2}-04-15`), endDate: new Date(`${y2}-06-30`) },
  ];
  for (const p of periods) {
    await prisma.gradePeriod.upsert({
      where: { unique_period_per_year: { tenantId, schoolYear, name: p.name } },
      update: {},
      create: {
        id: createId(),
        tenantId,
        schoolYear,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        isClosed: false,
      },
    });
  }
}
```

- [ ] **Step 3: Call the helper for each demo tenant**

Inside the existing `main()` of `seed.ts`, after each tenant creation block, add:

```typescript
await seedV6ForTenant(tenant.id, '2025-2026');
```

(one call per demo tenant, using whichever `tenant` variable the existing block defines).

- [ ] **Step 4: Run the seed**

```bash
cd apps/api
pnpm prisma db seed
```

Expected: no errors. `pnpm prisma studio` confirms `subjects` has 6 rows and `grade_periods` has 3 rows per demo tenant.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(v6): seed 6 subjects + 3 grade periods per demo tenant"
```

---

## Task 3: Install @react-pdf/renderer

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Install**

```bash
pnpm --filter=@ecole-saas/api add @react-pdf/renderer@^4.0.0
```

- [ ] **Step 2: Confirm**

```bash
pnpm --filter=@ecole-saas/api list @react-pdf/renderer
```

Expected: `@react-pdf/renderer 4.x.x`.

- [ ] **Step 3: Type-check**

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(v6): add @react-pdf/renderer for server-side PDF (D32)"
```

---

## Task 4: Subjects module — tests + service + controller + module

**Files:**
- Create: `apps/api/src/subjects/dto/subject.dto.ts`
- Create: `apps/api/src/subjects/subjects.service.ts`
- Create: `apps/api/src/subjects/subjects.service.spec.ts`
- Create: `apps/api/src/subjects/subjects.controller.ts`
- Create: `apps/api/src/subjects/subjects.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/subjects/subjects.service.spec.ts`:

```typescript
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SubjectsService } from './subjects.service';

const adminUser: AuthenticatedUser = {
  id: 'u_admin',
  tenantId: 't_demo',
  role: 'SCHOOL_ADMIN',
  email: 'admin@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    subject: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('SubjectsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: SubjectsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new SubjectsService(prisma as any);
  });

  it('rejects creation when tenantId is missing', async () => {
    const noTenant = { ...adminUser, tenantId: null } as AuthenticatedUser;
    await expect(service.create({ name: 'Math' }, noTenant)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a subject scoped to tenant', async () => {
    prisma.subject.create.mockResolvedValue({
      id: 's1', tenantId: 't_demo', name: 'Math', code: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    });
    const res = await service.create({ name: 'Math' }, adminUser);
    expect(res.id).toBe('s1');
    expect(res.name).toBe('Math');
    expect(prisma.subject.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 't_demo', name: 'Math' }),
    }));
  });

  it('maps Prisma unique-violation to SUBJECT_ALREADY_EXISTS', async () => {
    prisma.subject.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({ name: 'Math' }, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only non-deleted subjects for the tenant', async () => {
    prisma.subject.findMany.mockResolvedValue([{
      id: 's1', tenantId: 't_demo', name: 'Math', code: null,
      createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    }]);
    prisma.subject.count.mockResolvedValue(1);
    const res = await service.list(adminUser);
    expect(res.total).toBe(1);
    expect(prisma.subject.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 't_demo', deletedAt: null }),
    }));
  });

  it('throws NotFound when soft-deleting an unknown subject', async () => {
    prisma.subject.findFirst.mockResolvedValue(null);
    await expect(service.remove('s_missing', adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Create the DTO**

Create `apps/api/src/subjects/dto/subject.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiPropertyOptional({ example: 'MATH' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;
}

export class SubjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() code?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListSubjectsResponseDto {
  @ApiProperty({ type: [SubjectResponseDto] })
  items!: SubjectResponseDto[];
  @ApiProperty()
  total!: number;
}
```

- [ ] **Step 3: Create the service**

Create `apps/api/src/subjects/subjects.service.ts`:

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateSubjectDto,
  ListSubjectsResponseDto,
  SubjectResponseDto,
  UpdateSubjectDto,
} from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto, user: AuthenticatedUser): Promise<SubjectResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    try {
      const created = await this.prisma.subject.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          name: dto.name,
          code: dto.code ?? null,
        },
      });
      return this.toResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'SUBJECT_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async list(user: AuthenticatedUser): Promise<ListSubjectsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.SubjectWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({ where, orderBy: { name: 'asc' } }),
      this.prisma.subject.count({ where }),
    ]);
    return { items: items.map((s) => this.toResponse(s)), total };
  }

  async update(id: string, dto: UpdateSubjectDto, user: AuthenticatedUser): Promise<SubjectResponseDto> {
    const existing = await this.prisma.subject.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND' });
    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
      },
    });
    return this.toResponse(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.subject.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND' });
    await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(s: {
    id: string;
    name: string;
    code: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SubjectResponseDto {
    return { id: s.id, name: s.name, code: s.code, createdAt: s.createdAt, updatedAt: s.updatedAt };
  }
}
```

- [ ] **Step 4: Run the tests — they should PASS**

```bash
pnpm --filter=@ecole-saas/api test src/subjects/subjects.service.spec.ts
```

Expected: 5 passing tests.

- [ ] **Step 5: Create the controller**

Create `apps/api/src/subjects/subjects.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSubjectDto,
  ListSubjectsResponseDto,
  SubjectResponseDto,
  UpdateSubjectDto,
} from './dto/subject.dto';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List subjects of the tenant' })
  @ApiResponse({ status: 200, type: ListSubjectsResponseDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListSubjectsResponseDto> {
    return this.service.list(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a subject (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: SubjectResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a subject (SCHOOL_ADMIN)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<SubjectResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a subject (SCHOOL_ADMIN)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
```

- [ ] **Step 6: Create the module**

Create `apps/api/src/subjects/subjects.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

/** V6 — Subjects (matières). */
@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/subjects/
git commit -m "feat(v6): subjects CRUD (module + service + controller + tests)"
```

---

## Task 5: Grade Periods module — tests + service + controller + module

**Files:**
- Create: `apps/api/src/grade-periods/dto/grade-period.dto.ts`
- Create: `apps/api/src/grade-periods/grade-periods.service.ts`
- Create: `apps/api/src/grade-periods/grade-periods.service.spec.ts`
- Create: `apps/api/src/grade-periods/grade-periods.controller.ts`
- Create: `apps/api/src/grade-periods/grade-periods.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/grade-periods/grade-periods.service.spec.ts`:

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { GradePeriodsService } from './grade-periods.service';

const adminUser = {
  id: 'u_admin', tenantId: 't_demo', role: 'SCHOOL_ADMIN', email: 'admin@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    gradePeriod: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('GradePeriodsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: GradePeriodsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new GradePeriodsService(prisma as any);
  });

  it('rejects period with endDate <= startDate', async () => {
    const dto = {
      name: 'T1',
      schoolYear: '2025-2026',
      startDate: '2025-09-10',
      endDate: '2025-09-01',
    };
    await expect(service.create(dto, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects schoolYear not in YYYY-YYYY format', async () => {
    const dto = {
      name: 'T1',
      schoolYear: '2025',
      startDate: '2025-09-01',
      endDate: '2025-12-15',
    };
    await expect(service.create(dto, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a valid period', async () => {
    prisma.gradePeriod.create.mockResolvedValue({
      id: 'p1', tenantId: 't_demo', name: 'T1', schoolYear: '2025-2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'),
      isClosed: false, createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.create({
      name: 'T1', schoolYear: '2025-2026',
      startDate: '2025-09-01', endDate: '2025-12-15',
    }, adminUser);
    expect(res.name).toBe('T1');
    expect(res.isClosed).toBe(false);
  });

  it('maps unique-violation to PERIOD_ALREADY_EXISTS', async () => {
    prisma.gradePeriod.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' }),
    );
    await expect(service.create({
      name: 'T1', schoolYear: '2025-2026',
      startDate: '2025-09-01', endDate: '2025-12-15',
    }, adminUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('close() flips isClosed=true', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', isClosed: false });
    prisma.gradePeriod.update.mockResolvedValue({
      id: 'p1', tenantId: 't_demo', name: 'T1', schoolYear: '2025-2026',
      startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'),
      isClosed: true, createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.close('p1', adminUser);
    expect(res.isClosed).toBe(true);
  });

  it('close() throws NotFound on unknown period', async () => {
    prisma.gradePeriod.findFirst.mockResolvedValue(null);
    await expect(service.close('p_missing', adminUser)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Create the DTO**

Create `apps/api/src/grade-periods/dto/grade-period.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGradePeriodDto {
  @ApiProperty({ example: 'T1' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @Matches(/^\d{4}-\d{4}$/, { message: 'schoolYear must match "YYYY-YYYY"' })
  schoolYear!: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-12-15' })
  @IsDateString()
  endDate!: string;
}

export class UpdateGradePeriodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class GradePeriodResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() schoolYear!: string;
  @ApiProperty() startDate!: Date;
  @ApiProperty() endDate!: Date;
  @ApiProperty() isClosed!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListGradePeriodsResponseDto {
  @ApiProperty({ type: [GradePeriodResponseDto] })
  items!: GradePeriodResponseDto[];
  @ApiProperty()
  total!: number;
}
```

- [ ] **Step 3: Create the service**

Create `apps/api/src/grade-periods/grade-periods.service.ts`:

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateGradePeriodDto,
  GradePeriodResponseDto,
  ListGradePeriodsResponseDto,
  UpdateGradePeriodDto,
} from './dto/grade-period.dto';

@Injectable()
export class GradePeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGradePeriodDto, user: AuthenticatedUser): Promise<GradePeriodResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    if (!/^\d{4}-\d{4}$/.test(dto.schoolYear)) {
      throw new BadRequestException({ code: 'INVALID_SCHOOL_YEAR' });
    }
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE' });
    }
    try {
      const created = await this.prisma.gradePeriod.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          name: dto.name,
          schoolYear: dto.schoolYear,
          startDate: start,
          endDate: end,
          isClosed: false,
        },
      });
      return this.toResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'PERIOD_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async list(user: AuthenticatedUser, schoolYear?: string): Promise<ListGradePeriodsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.GradePeriodWhereInput = {
      tenantId: user.tenantId,
      ...(schoolYear ? { schoolYear } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.gradePeriod.findMany({
        where,
        orderBy: [{ schoolYear: 'desc' }, { startDate: 'asc' }],
      }),
      this.prisma.gradePeriod.count({ where }),
    ]);
    return { items: items.map((p) => this.toResponse(p)), total };
  }

  async update(id: string, dto: UpdateGradePeriodDto, user: AuthenticatedUser): Promise<GradePeriodResponseDto> {
    const existing = await this.prisma.gradePeriod.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });

    const nextStart = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const nextEnd = dto.endDate ? new Date(dto.endDate) : existing.endDate;
    if (nextEnd <= nextStart) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE' });
    }

    const updated = await this.prisma.gradePeriod.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isClosed !== undefined ? { isClosed: dto.isClosed } : {}),
      },
    });
    return this.toResponse(updated);
  }

  async close(id: string, user: AuthenticatedUser): Promise<GradePeriodResponseDto> {
    const existing = await this.prisma.gradePeriod.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });
    const updated = await this.prisma.gradePeriod.update({
      where: { id },
      data: { isClosed: true },
    });
    return this.toResponse(updated);
  }

  private toResponse(p: {
    id: string;
    name: string;
    schoolYear: string;
    startDate: Date;
    endDate: Date;
    isClosed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): GradePeriodResponseDto {
    return {
      id: p.id,
      name: p.name,
      schoolYear: p.schoolYear,
      startDate: p.startDate,
      endDate: p.endDate,
      isClosed: p.isClosed,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
```

- [ ] **Step 4: Run the tests — they should PASS**

```bash
pnpm --filter=@ecole-saas/api test src/grade-periods/grade-periods.service.spec.ts
```

Expected: 6 passing tests.

- [ ] **Step 5: Create the controller**

Create `apps/api/src/grade-periods/grade-periods.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateGradePeriodDto,
  GradePeriodResponseDto,
  ListGradePeriodsResponseDto,
  UpdateGradePeriodDto,
} from './dto/grade-period.dto';
import { GradePeriodsService } from './grade-periods.service';

@ApiTags('grade-periods')
@ApiBearerAuth()
@Controller('grade-periods')
export class GradePeriodsController {
  constructor(private readonly service: GradePeriodsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List grade periods (optional ?schoolYear=...)' })
  @ApiResponse({ status: 200, type: ListGradePeriodsResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('schoolYear') schoolYear?: string,
  ): Promise<ListGradePeriodsResponseDto> {
    return this.service.list(user, schoolYear);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a grade period (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: GradePeriodResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGradePeriodDto,
  ): Promise<GradePeriodResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a grade period (SCHOOL_ADMIN)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGradePeriodDto,
  ): Promise<GradePeriodResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Post(':id/close')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Close a grade period — no more grade edits (SCHOOL_ADMIN)' })
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<GradePeriodResponseDto> {
    return this.service.close(id, user);
  }
}
```

- [ ] **Step 6: Create the module**

Create `apps/api/src/grade-periods/grade-periods.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { GradePeriodsController } from './grade-periods.controller';
import { GradePeriodsService } from './grade-periods.service';

/** V6 — Grade periods (trimestres / semestres). */
@Module({
  controllers: [GradePeriodsController],
  providers: [GradePeriodsService],
  exports: [GradePeriodsService],
})
export class GradePeriodsModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/grade-periods/
git commit -m "feat(v6): grade periods CRUD + close-period action"
```

---

## Task 6: Evaluations + Grades module

**Files:**
- Create: `apps/api/src/evaluations/dto/evaluation.dto.ts`
- Create: `apps/api/src/evaluations/evaluations.service.ts`
- Create: `apps/api/src/evaluations/evaluations.service.spec.ts`
- Create: `apps/api/src/evaluations/evaluations.controller.ts`
- Create: `apps/api/src/evaluations/evaluations.module.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/evaluations/evaluations.service.spec.ts`:

```typescript
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { EvaluationsService } from './evaluations.service';

const adminUser = {
  id: 'u_admin', tenantId: 't_demo', role: 'SCHOOL_ADMIN', email: 'admin@demo.tn',
} as AuthenticatedUser;
const teacherUser = {
  id: 'u_teacher', tenantId: 't_demo', role: 'TEACHER', email: 'teacher@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    class: { findFirst: vi.fn() },
    subject: { findFirst: vi.fn() },
    gradePeriod: { findFirst: vi.fn() },
    classTeacher: { findFirst: vi.fn() },
    evaluation: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    grade: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    student: { findFirst: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('EvaluationsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: EvaluationsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new EvaluationsService(prisma as any);
  });

  const baseCreateDto = {
    classId: 'c1',
    subjectId: 's1',
    gradePeriodId: 'p1',
    title: 'Contrôle chap 3',
    date: '2025-10-15',
    maxScore: 20,
  };

  it('rejects when maxScore <= 0', async () => {
    await expect(service.createEvaluation({ ...baseCreateDto, maxScore: 0 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects TEACHER who is not assigned to the class', async () => {
    prisma.class.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.subject.findFirst.mockResolvedValue({ id: 's1' });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', isClosed: false });
    prisma.classTeacher.findFirst.mockResolvedValue(null);
    await expect(service.createEvaluation(baseCreateDto, teacherUser))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows SCHOOL_ADMIN to create eval without classTeacher row', async () => {
    prisma.class.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.subject.findFirst.mockResolvedValue({ id: 's1' });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', isClosed: false });
    prisma.evaluation.create.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      title: 'Contrôle', date: new Date('2025-10-15'), maxScore: 20, createdById: 'u_admin',
      createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.createEvaluation(baseCreateDto, adminUser);
    expect(res.id).toBe('e1');
    expect(prisma.classTeacher.findFirst).not.toHaveBeenCalled();
  });

  it('refuses grade entry on a closed period', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: true },
    });
    await expect(service.upsertGrade('e1', { studentId: 'st1', score: 12 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses grade with score > maxScore', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: false },
    });
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', tenantId: 't_demo' });
    await expect(service.upsertGrade('e1', { studentId: 'st1', score: 25 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses grade with score < 0', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: false },
    });
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', tenantId: 't_demo' });
    await expect(service.upsertGrade('e1', { studentId: 'st1', score: -1 }, adminUser))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('upserts grade successfully when score valid and period open', async () => {
    prisma.evaluation.findFirst.mockResolvedValue({
      id: 'e1', tenantId: 't_demo', classId: 'c1', subjectId: 's1', gradePeriodId: 'p1',
      maxScore: 20, gradePeriod: { isClosed: false },
    });
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', tenantId: 't_demo' });
    prisma.grade.upsert.mockResolvedValue({
      id: 'g1', tenantId: 't_demo', evaluationId: 'e1', studentId: 'st1', score: 15,
      createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await service.upsertGrade('e1', { studentId: 'st1', score: 15 }, adminUser);
    expect(res.score).toBe(15);
  });
});
```

- [ ] **Step 2: Create the DTO**

Create `apps/api/src/evaluations/dto/evaluation.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEvaluationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  classId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  gradePeriodId!: string;

  @ApiProperty({ example: 'Contrôle chap. 3' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: '2025-10-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 20, minimum: 0.01, maximum: 1000 })
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  maxScore!: number;
}

export class UpdateEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ minimum: 0.01, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  maxScore?: number;
}

export class UpsertGradeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty({ example: 14.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  score!: number;
}

export class EvaluationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty() gradePeriodId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() date!: Date;
  @ApiProperty() maxScore!: number;
  @ApiProperty() createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class GradeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() evaluationId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() score!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListEvaluationsResponseDto {
  @ApiProperty({ type: [EvaluationResponseDto] })
  items!: EvaluationResponseDto[];
  @ApiProperty()
  total!: number;
}

export class EvaluationWithGradesResponseDto {
  @ApiProperty({ type: EvaluationResponseDto })
  evaluation!: EvaluationResponseDto;
  @ApiProperty({ type: [GradeResponseDto] })
  grades!: GradeResponseDto[];
}
```

- [ ] **Step 3: Create the service**

Create `apps/api/src/evaluations/evaluations.service.ts`:

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateEvaluationDto,
  EvaluationResponseDto,
  EvaluationWithGradesResponseDto,
  GradeResponseDto,
  ListEvaluationsResponseDto,
  UpdateEvaluationDto,
  UpsertGradeDto,
} from './dto/evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───── Evaluations ─────

  async createEvaluation(
    dto: CreateEvaluationDto,
    user: AuthenticatedUser,
  ): Promise<EvaluationResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    if (dto.maxScore <= 0) throw new BadRequestException({ code: 'INVALID_MAX_SCORE' });

    const [klass, subject, period] = await Promise.all([
      this.prisma.class.findFirst({
        where: { id: dto.classId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.subject.findFirst({
        where: { id: dto.subjectId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.gradePeriod.findFirst({
        where: { id: dto.gradePeriodId, tenantId: user.tenantId },
        select: { id: true, isClosed: true },
      }),
    ]);
    if (!klass) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    if (!subject) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND' });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });
    if (period.isClosed) throw new BadRequestException({ code: 'PERIOD_CLOSED' });

    if (user.role === UserRole.TEACHER) {
      const assignment = await this.prisma.classTeacher.findFirst({
        where: { classId: dto.classId, teacherUserId: user.id, tenantId: user.tenantId },
        select: { id: true },
      });
      if (!assignment) throw new ForbiddenException({ code: 'NOT_ASSIGNED_TO_CLASS' });
    }

    const created = await this.prisma.evaluation.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        gradePeriodId: dto.gradePeriodId,
        title: dto.title,
        date: new Date(dto.date),
        maxScore: dto.maxScore,
        createdById: user.id,
      },
    });
    return this.toEvaluationResponse(created);
  }

  async listEvaluations(
    user: AuthenticatedUser,
    filters: { classId?: string; gradePeriodId?: string; subjectId?: string },
  ): Promise<ListEvaluationsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.EvaluationWhereInput = {
      tenantId: user.tenantId,
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.gradePeriodId ? { gradePeriodId: filters.gradePeriodId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.evaluation.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.evaluation.count({ where }),
    ]);
    return { items: items.map((e) => this.toEvaluationResponse(e)), total };
  }

  async getEvaluationWithGrades(
    id: string,
    user: AuthenticatedUser,
  ): Promise<EvaluationWithGradesResponseDto> {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
      include: { grades: true },
    });
    if (!evaluation) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    return {
      evaluation: this.toEvaluationResponse(evaluation),
      grades: evaluation.grades.map((g) => this.toGradeResponse(g)),
    };
  }

  async updateEvaluation(
    id: string,
    dto: UpdateEvaluationDto,
    user: AuthenticatedUser,
  ): Promise<EvaluationResponseDto> {
    const existing = await this.prisma.evaluation.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    await this.ensureTeacherAssignment(user, existing.classId);

    const updated = await this.prisma.evaluation.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.maxScore !== undefined ? { maxScore: dto.maxScore } : {}),
      },
    });
    return this.toEvaluationResponse(updated);
  }

  async deleteEvaluation(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.evaluation.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined },
    });
    if (!existing) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    await this.ensureTeacherAssignment(user, existing.classId);
    await this.prisma.evaluation.delete({ where: { id } });
  }

  // ───── Grades ─────

  async upsertGrade(
    evaluationId: string,
    dto: UpsertGradeDto,
    user: AuthenticatedUser,
  ): Promise<GradeResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });

    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, tenantId: user.tenantId },
      include: { gradePeriod: { select: { isClosed: true } } },
    });
    if (!evaluation) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    if (evaluation.gradePeriod.isClosed) throw new BadRequestException({ code: 'PERIOD_CLOSED' });

    await this.ensureTeacherAssignment(user, evaluation.classId);

    if (dto.score < 0 || dto.score > evaluation.maxScore) {
      throw new BadRequestException({ code: 'SCORE_OUT_OF_RANGE' });
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    const upserted = await this.prisma.grade.upsert({
      where: { unique_grade_per_eval_student: { evaluationId, studentId: dto.studentId } },
      create: {
        id: createId(),
        tenantId: user.tenantId,
        evaluationId,
        studentId: dto.studentId,
        score: dto.score,
      },
      update: { score: dto.score },
    });
    return this.toGradeResponse(upserted);
  }

  async deleteGrade(
    evaluationId: string,
    studentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, tenantId: user.tenantId ?? undefined },
      include: { gradePeriod: { select: { isClosed: true } } },
    });
    if (!evaluation) throw new NotFoundException({ code: 'EVALUATION_NOT_FOUND' });
    if (evaluation.gradePeriod.isClosed) throw new BadRequestException({ code: 'PERIOD_CLOSED' });
    await this.ensureTeacherAssignment(user, evaluation.classId);

    const existing = await this.prisma.grade.findFirst({
      where: { evaluationId, studentId },
    });
    if (!existing) throw new NotFoundException({ code: 'GRADE_NOT_FOUND' });
    await this.prisma.grade.delete({ where: { id: existing.id } });
  }

  // ───── Helpers ─────

  private async ensureTeacherAssignment(user: AuthenticatedUser, classId: string): Promise<void> {
    if (user.role !== UserRole.TEACHER) return;
    const assignment = await this.prisma.classTeacher.findFirst({
      where: { classId, teacherUserId: user.id, tenantId: user.tenantId ?? undefined },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException({ code: 'NOT_ASSIGNED_TO_CLASS' });
  }

  private toEvaluationResponse(e: {
    id: string;
    classId: string;
    subjectId: string;
    gradePeriodId: string;
    title: string;
    date: Date;
    maxScore: number;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }): EvaluationResponseDto {
    return {
      id: e.id,
      classId: e.classId,
      subjectId: e.subjectId,
      gradePeriodId: e.gradePeriodId,
      title: e.title,
      date: e.date,
      maxScore: e.maxScore,
      createdById: e.createdById,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private toGradeResponse(g: {
    id: string;
    evaluationId: string;
    studentId: string;
    score: number;
    createdAt: Date;
    updatedAt: Date;
  }): GradeResponseDto {
    return {
      id: g.id,
      evaluationId: g.evaluationId,
      studentId: g.studentId,
      score: g.score,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}
```

- [ ] **Step 4: Run the tests — they should PASS**

```bash
pnpm --filter=@ecole-saas/api test src/evaluations/evaluations.service.spec.ts
```

Expected: 7 passing tests.

- [ ] **Step 5: Create the controller**

Create `apps/api/src/evaluations/evaluations.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateEvaluationDto,
  EvaluationResponseDto,
  EvaluationWithGradesResponseDto,
  GradeResponseDto,
  ListEvaluationsResponseDto,
  UpdateEvaluationDto,
  UpsertGradeDto,
} from './dto/evaluation.dto';
import { EvaluationsService } from './evaluations.service';

@ApiTags('evaluations')
@ApiBearerAuth()
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List evaluations (filters: classId, gradePeriodId, subjectId)' })
  @ApiResponse({ status: 200, type: ListEvaluationsResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classId') classId?: string,
    @Query('gradePeriodId') gradePeriodId?: string,
    @Query('subjectId') subjectId?: string,
  ): Promise<ListEvaluationsResponseDto> {
    return this.service.listEvaluations(user, { classId, gradePeriodId, subjectId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create an evaluation (SCHOOL_ADMIN, TEACHER on assigned class)' })
  @ApiResponse({ status: 201, type: EvaluationResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    return this.service.createEvaluation(dto, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get evaluation with all grades' })
  @ApiResponse({ status: 200, type: EvaluationWithGradesResponseDto })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EvaluationWithGradesResponseDto> {
    return this.service.getEvaluationWithGrades(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update an evaluation (SCHOOL_ADMIN, TEACHER on assigned class)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    return this.service.updateEvaluation(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete an evaluation (SCHOOL_ADMIN, TEACHER on assigned class)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.deleteEvaluation(id, user);
  }

  @Put(':id/grades')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Upsert a grade for one student on this evaluation' })
  @ApiResponse({ status: 200, type: GradeResponseDto })
  upsertGrade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') evaluationId: string,
    @Body() dto: UpsertGradeDto,
  ): Promise<GradeResponseDto> {
    return this.service.upsertGrade(evaluationId, dto, user);
  }

  @Delete(':id/grades/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a grade' })
  deleteGrade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') evaluationId: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    return this.service.deleteGrade(evaluationId, studentId, user);
  }
}
```

- [ ] **Step 6: Create the module**

Create `apps/api/src/evaluations/evaluations.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

/** V6 — Evaluations + Grades (TEACHER & SCHOOL_ADMIN). */
@Module({
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/evaluations/
git commit -m "feat(v6): evaluations + grades CRUD with TEACHER class-scoped auth"
```

---

## Task 7: Bulletin — PDF template (React component)

**Files:**
- Create: `apps/api/src/bulletins/templates/bulletin-document.tsx`

- [ ] **Step 1: Create the PDF template**

Create `apps/api/src/bulletins/templates/bulletin-document.tsx`:

```tsx
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

export interface BulletinSubjectEntry {
  subjectId: string;
  subjectName: string;
  grades: Array<{
    evalTitle: string;
    date: string;
    score: number;
    maxScore: number;
    scaledScore: number;
  }>;
  average: number | null;
}

export interface BulletinDocumentProps {
  schoolName: string;
  studentFirstName: string;
  studentLastName: string;
  studentClassroom: string;
  periodName: string;
  schoolYear: string;
  subjects: BulletinSubjectEntry[];
  overallAverage: number | null;
  generatedAt: string;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '2px solid #1a1a1a',
    paddingBottom: 10,
    marginBottom: 20,
  },
  schoolName: { fontSize: 18, fontWeight: 700 },
  periodLabel: { fontSize: 12, color: '#555' },
  studentBlock: {
    marginBottom: 18,
    padding: 12,
    backgroundColor: '#f4f4f4',
    borderRadius: 4,
  },
  studentName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  studentMeta: { fontSize: 10, color: '#555' },
  subjectsHeading: { fontSize: 13, fontWeight: 700, marginBottom: 10 },
  table: { width: '100%' },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#e9e9e9',
    padding: 6,
    borderBottom: '1px solid #ccc',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1px solid #eee',
  },
  colSubject: { width: '40%' },
  colAvg: { width: '20%', textAlign: 'right' },
  colCount: { width: '20%', textAlign: 'right' },
  colDetails: { width: '20%', textAlign: 'right' },
  bold: { fontWeight: 700 },
  overallBlock: {
    marginTop: 24,
    padding: 14,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallLabel: { fontSize: 12 },
  overallValue: { fontSize: 20, fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#888',
    textAlign: 'center',
  },
  emptyNotice: {
    padding: 16,
    backgroundColor: '#fff4cc',
    border: '1px solid #d4b800',
    borderRadius: 4,
    marginTop: 12,
  },
});

function formatAverage(v: number | null): string {
  return v === null ? '—' : v.toFixed(2);
}

export const BulletinDocument: React.FC<BulletinDocumentProps> = ({
  schoolName,
  studentFirstName,
  studentLastName,
  studentClassroom,
  periodName,
  schoolYear,
  subjects,
  overallAverage,
  generatedAt,
}) => (
  <Document
    title={`Bulletin ${studentLastName} ${studentFirstName} — ${periodName} ${schoolYear}`}
    author={schoolName}
  >
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.periodLabel}>Bulletin scolaire</Text>
        </View>
        <View>
          <Text style={styles.periodLabel}>{periodName} — {schoolYear}</Text>
        </View>
      </View>

      <View style={styles.studentBlock}>
        <Text style={styles.studentName}>{studentLastName.toUpperCase()} {studentFirstName}</Text>
        <Text style={styles.studentMeta}>Classe : {studentClassroom}</Text>
      </View>

      <Text style={styles.subjectsHeading}>Résultats par matière</Text>

      {subjects.length === 0 ? (
        <View style={styles.emptyNotice}>
          <Text>Aucune note enregistrée pour cette période.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.colSubject, styles.bold]}>Matière</Text>
            <Text style={[styles.colAvg, styles.bold]}>Moyenne /20</Text>
            <Text style={[styles.colCount, styles.bold]}>Notes</Text>
            <Text style={[styles.colDetails, styles.bold]}>Détails</Text>
          </View>
          {subjects.map((s) => (
            <View key={s.subjectId} style={styles.tableRow}>
              <Text style={styles.colSubject}>{s.subjectName}</Text>
              <Text style={[styles.colAvg, styles.bold]}>{formatAverage(s.average)}</Text>
              <Text style={styles.colCount}>{s.grades.length}</Text>
              <Text style={styles.colDetails}>
                {s.grades.map((g) => g.scaledScore.toFixed(1)).join(' · ')}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.overallBlock}>
        <Text style={styles.overallLabel}>Moyenne générale</Text>
        <Text style={styles.overallValue}>{formatAverage(overallAverage)} / 20</Text>
      </View>

      <Text style={styles.footer}>
        Généré le {new Date(generatedAt).toLocaleString('fr-FR')} — Klasso
      </Text>
    </Page>
  </Document>
);
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/bulletins/templates/
git commit -m "feat(v6): @react-pdf bulletin document template"
```

---

## Task 8: Bulletin service — snapshot + PDF generation + tests

**Files:**
- Create: `apps/api/src/bulletins/dto/bulletin.dto.ts`
- Create: `apps/api/src/bulletins/bulletin-pdf.service.ts`
- Create: `apps/api/src/bulletins/bulletins.service.ts`
- Create: `apps/api/src/bulletins/bulletins.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/bulletins/bulletins.service.spec.ts`:

```typescript
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { BulletinPdfService } from './bulletin-pdf.service';
import { BulletinsService } from './bulletins.service';

const adminUser = {
  id: 'u_admin', tenantId: 't_demo', role: 'SCHOOL_ADMIN', email: 'admin@demo.tn',
} as AuthenticatedUser;

function buildPrismaMock() {
  return {
    student: { findFirst: vi.fn() },
    gradePeriod: { findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
    evaluation: { findMany: vi.fn() },
    bulletin: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
  };
}

function buildPdfMock() {
  return {
    render: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
  };
}

describe('BulletinsService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let pdf: ReturnType<typeof buildPdfMock>;
  let service: BulletinsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    pdf = buildPdfMock();
    service = new BulletinsService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma as any,
      pdf as unknown as BulletinPdfService,
    );
  });

  it('throws when student not in tenant', async () => {
    prisma.student.findFirst.mockResolvedValue(null);
    await expect(service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when period not found', async () => {
    prisma.student.findFirst.mockResolvedValue({ id: 'st1', firstName: 'Lina', lastName: 'B', classroom: 'CP-A' });
    prisma.gradePeriod.findFirst.mockResolvedValue(null);
    await expect(service.generate({ studentId: 'st1', gradePeriodId: 'p_missing' }, adminUser))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('computes per-subject and overall averages correctly', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'st1', firstName: 'Lina', lastName: 'Bouaziz', classroom: 'CP-A',
    });
    prisma.gradePeriod.findFirst.mockResolvedValue({
      id: 'p1', name: 'T1', schoolYear: '2025-2026',
    });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't_demo', name: 'École Demo' });
    prisma.evaluation.findMany.mockResolvedValue([
      {
        id: 'e1', subjectId: 'sub-math', maxScore: 20, title: 'Contrôle 1', date: new Date('2025-09-15'),
        subject: { id: 'sub-math', name: 'Mathématiques' },
        grades: [{ id: 'g1', studentId: 'st1', score: 10 }],
      },
      {
        id: 'e2', subjectId: 'sub-math', maxScore: 20, title: 'Contrôle 2', date: new Date('2025-10-15'),
        subject: { id: 'sub-math', name: 'Mathématiques' },
        grades: [{ id: 'g2', studentId: 'st1', score: 16 }],
      },
      {
        id: 'e3', subjectId: 'sub-fr', maxScore: 20, title: 'Dictée', date: new Date('2025-09-20'),
        subject: { id: 'sub-fr', name: 'Français' },
        grades: [{ id: 'g3', studentId: 'st1', score: 15 }],
      },
    ]);
    prisma.bulletin.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      generatedAt: new Date(),
    }));

    const result = await service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser);

    expect(result.snapshot.overallAverage).toBeCloseTo(14, 5);
    expect(result.snapshot.subjects).toHaveLength(2);
    const math = result.snapshot.subjects.find((s) => s.subjectId === 'sub-math');
    expect(math?.average).toBeCloseTo(13, 5);
    expect(math?.grades).toHaveLength(2);
    expect(result.pdf).toBeInstanceOf(Buffer);
    expect(pdf.render).toHaveBeenCalledTimes(1);
  });

  it('handles student with zero grades — overallAverage null, empty subjects', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'st1', firstName: 'L', lastName: 'B', classroom: 'CP-A',
    });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'T1', schoolYear: '2025-2026' });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't_demo', name: 'École Demo' });
    prisma.evaluation.findMany.mockResolvedValue([]);
    prisma.bulletin.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      generatedAt: new Date(),
    }));

    const result = await service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser);
    expect(result.snapshot.overallAverage).toBeNull();
    expect(result.snapshot.subjects).toHaveLength(0);
  });

  it('ignores evaluations whose student has no grade row', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'st1', firstName: 'L', lastName: 'B', classroom: 'CP-A',
    });
    prisma.gradePeriod.findFirst.mockResolvedValue({ id: 'p1', name: 'T1', schoolYear: '2025-2026' });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't_demo', name: 'École Demo' });
    prisma.evaluation.findMany.mockResolvedValue([
      {
        id: 'e1', subjectId: 'sub-math', maxScore: 20, title: 'Contrôle 1', date: new Date('2025-09-15'),
        subject: { id: 'sub-math', name: 'Mathématiques' },
        grades: [],
      },
    ]);
    prisma.bulletin.upsert.mockImplementation(async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      generatedAt: new Date(),
    }));

    const result = await service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, adminUser);
    expect(result.snapshot.subjects).toHaveLength(0);
    expect(result.snapshot.overallAverage).toBeNull();
  });

  it('rejects when tenantId is missing', async () => {
    const noTenant = { ...adminUser, tenantId: null } as AuthenticatedUser;
    await expect(service.generate({ studentId: 'st1', gradePeriodId: 'p1' }, noTenant))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
```

- [ ] **Step 2: Create the DTO**

Create `apps/api/src/bulletins/dto/bulletin.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GenerateBulletinDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  gradePeriodId!: string;
}

export interface BulletinGradeEntryDto {
  evalTitle: string;
  date: string;
  score: number;
  maxScore: number;
  scaledScore: number;
}

export interface BulletinSubjectEntryDto {
  subjectId: string;
  subjectName: string;
  grades: BulletinGradeEntryDto[];
  average: number | null;
}

export interface BulletinSnapshotDto {
  student: { id: string; firstName: string; lastName: string; classroom: string };
  period: { id: string; name: string; schoolYear: string };
  schoolName: string;
  subjects: BulletinSubjectEntryDto[];
  overallAverage: number | null;
  generatedAt: string;
}

export class BulletinResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() gradePeriodId!: string;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() generatedById!: string;
  @ApiPropertyOptional() pdfUrl?: string | null;
}
```

- [ ] **Step 3: Create the PDF service**

Create `apps/api/src/bulletins/bulletin-pdf.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';

import { BulletinDocument, type BulletinDocumentProps } from './templates/bulletin-document';

@Injectable()
export class BulletinPdfService {
  async render(props: BulletinDocumentProps): Promise<Buffer> {
    return renderToBuffer(React.createElement(BulletinDocument, props));
  }
}
```

- [ ] **Step 4: Create the service**

Create `apps/api/src/bulletins/bulletins.service.ts`:

```typescript
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { BulletinPdfService } from './bulletin-pdf.service';
import type {
  BulletinResponseDto,
  BulletinSnapshotDto,
  BulletinSubjectEntryDto,
  GenerateBulletinDto,
} from './dto/bulletin.dto';

interface EvaluationWithSubjectAndGrade {
  id: string;
  subjectId: string;
  maxScore: number;
  title: string;
  date: Date;
  subject: { id: string; name: string };
  grades: Array<{ id: string; studentId: string; score: number }>;
}

@Injectable()
export class BulletinsService {
  private readonly logger = new Logger(BulletinsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: BulletinPdfService,
  ) {}

  async generate(
    dto: GenerateBulletinDto,
    user: AuthenticatedUser,
  ): Promise<{ bulletin: BulletinResponseDto; snapshot: BulletinSnapshotDto; pdf: Buffer }> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, classroom: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    const period = await this.prisma.gradePeriod.findFirst({
      where: { id: dto.gradePeriodId, tenantId: user.tenantId },
      select: { id: true, name: true, schoolYear: true },
    });
    if (!period) throw new NotFoundException({ code: 'PERIOD_NOT_FOUND' });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });

    const evaluations = (await this.prisma.evaluation.findMany({
      where: {
        tenantId: user.tenantId,
        gradePeriodId: period.id,
      },
      include: {
        subject: { select: { id: true, name: true } },
        grades: {
          where: { studentId: student.id },
          select: { id: true, studentId: true, score: true },
        },
      },
      orderBy: [{ subject: { name: 'asc' } }, { date: 'asc' }],
    })) as unknown as EvaluationWithSubjectAndGrade[];

    const snapshot = this.buildSnapshot({
      student,
      period,
      schoolName: tenant?.name ?? 'École',
      evaluations,
    });

    const pdfBuffer = await this.pdf.render({
      schoolName: snapshot.schoolName,
      studentFirstName: snapshot.student.firstName,
      studentLastName: snapshot.student.lastName,
      studentClassroom: snapshot.student.classroom,
      periodName: snapshot.period.name,
      schoolYear: snapshot.period.schoolYear,
      subjects: snapshot.subjects,
      overallAverage: snapshot.overallAverage,
      generatedAt: snapshot.generatedAt,
    });

    const bulletin = await this.prisma.bulletin.upsert({
      where: {
        unique_bulletin_per_student_period: {
          studentId: student.id,
          gradePeriodId: period.id,
        },
      },
      create: {
        id: createId(),
        tenantId: user.tenantId,
        studentId: student.id,
        gradePeriodId: period.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: snapshot as any,
        generatedById: user.id,
      },
      update: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: snapshot as any,
        generatedById: user.id,
        generatedAt: new Date(),
      },
    });

    return {
      bulletin: {
        id: bulletin.id,
        studentId: bulletin.studentId,
        gradePeriodId: bulletin.gradePeriodId,
        generatedAt: bulletin.generatedAt,
        generatedById: bulletin.generatedById,
        pdfUrl: bulletin.pdfUrl,
      },
      snapshot,
      pdf: pdfBuffer,
    };
  }

  async getLatest(
    studentId: string,
    gradePeriodId: string,
    user: AuthenticatedUser,
  ): Promise<BulletinResponseDto | null> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const b = await this.prisma.bulletin.findFirst({
      where: { tenantId: user.tenantId, studentId, gradePeriodId },
    });
    if (!b) return null;
    return {
      id: b.id,
      studentId: b.studentId,
      gradePeriodId: b.gradePeriodId,
      generatedAt: b.generatedAt,
      generatedById: b.generatedById,
      pdfUrl: b.pdfUrl,
    };
  }

  private buildSnapshot(args: {
    student: { id: string; firstName: string; lastName: string; classroom: string };
    period: { id: string; name: string; schoolYear: string };
    schoolName: string;
    evaluations: EvaluationWithSubjectAndGrade[];
  }): BulletinSnapshotDto {
    const bySubject = new Map<string, BulletinSubjectEntryDto>();

    for (const e of args.evaluations) {
      if (e.grades.length === 0) continue;
      const grade = e.grades[0];
      const scaled = (grade.score / e.maxScore) * 20;
      const entry = bySubject.get(e.subjectId) ?? {
        subjectId: e.subjectId,
        subjectName: e.subject.name,
        grades: [],
        average: null,
      };
      entry.grades.push({
        evalTitle: e.title,
        date: e.date.toISOString(),
        score: grade.score,
        maxScore: e.maxScore,
        scaledScore: scaled,
      });
      bySubject.set(e.subjectId, entry);
    }

    for (const entry of bySubject.values()) {
      const sum = entry.grades.reduce((acc, g) => acc + g.scaledScore, 0);
      entry.average = entry.grades.length > 0 ? sum / entry.grades.length : null;
    }

    const subjects = Array.from(bySubject.values()).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, 'fr'),
    );

    const validAverages = subjects.map((s) => s.average).filter((a): a is number => a !== null);
    const overallAverage =
      validAverages.length > 0
        ? validAverages.reduce((a, b) => a + b, 0) / validAverages.length
        : null;

    return {
      student: args.student,
      period: args.period,
      schoolName: args.schoolName,
      subjects,
      overallAverage,
      generatedAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 5: Run the tests — they should PASS**

```bash
pnpm --filter=@ecole-saas/api test src/bulletins/bulletins.service.spec.ts
```

Expected: 6 passing tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/bulletins/dto/ apps/api/src/bulletins/bulletin-pdf.service.ts apps/api/src/bulletins/bulletins.service.ts apps/api/src/bulletins/bulletins.service.spec.ts
git commit -m "feat(v6): bulletin service — snapshot averages + @react-pdf rendering"
```

---

## Task 9: Bulletin controller + module

**Files:**
- Create: `apps/api/src/bulletins/bulletins.controller.ts`
- Create: `apps/api/src/bulletins/bulletins.module.ts`

- [ ] **Step 1: Create the controller**

Create `apps/api/src/bulletins/bulletins.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BulletinsService } from './bulletins.service';
import {
  BulletinResponseDto,
  GenerateBulletinDto,
} from './dto/bulletin.dto';

@ApiTags('bulletins')
@ApiBearerAuth()
@Controller('bulletins')
export class BulletinsController {
  constructor(private readonly service: BulletinsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Generate / re-generate bulletin PDF for a (student, period). Returns the PDF.' })
  @ApiResponse({ status: 200, description: 'application/pdf' })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateBulletinDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, bulletin } = await this.service.generate(dto, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="bulletin_${bulletin.studentId}_${bulletin.gradePeriodId}.pdf"`,
    );
    res.setHeader('X-Bulletin-Id', bulletin.id);
    res.send(pdf);
  }

  @Get(':studentId/:gradePeriodId/latest')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get latest bulletin metadata for (student, period) — null if not generated yet' })
  @ApiResponse({ status: 200, type: BulletinResponseDto })
  latest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Param('gradePeriodId') gradePeriodId: string,
  ): Promise<BulletinResponseDto | null> {
    return this.service.getLatest(studentId, gradePeriodId, user);
  }
}
```

- [ ] **Step 2: Create the module**

Create `apps/api/src/bulletins/bulletins.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { BulletinPdfService } from './bulletin-pdf.service';
import { BulletinsController } from './bulletins.controller';
import { BulletinsService } from './bulletins.service';

/** V6 — Bulletins (PDF generation). */
@Module({
  controllers: [BulletinsController],
  providers: [BulletinsService, BulletinPdfService],
  exports: [BulletinsService],
})
export class BulletinsModule {}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/bulletins/bulletins.controller.ts apps/api/src/bulletins/bulletins.module.ts
git commit -m "feat(v6): bulletins controller + module"
```

---

## Task 10: Register the 4 new modules in app.module.ts

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add the 4 imports**

In `apps/api/src/app.module.ts`, add (alphabetical position helps but is not strict):

```typescript
import { BulletinsModule } from './bulletins/bulletins.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { GradePeriodsModule } from './grade-periods/grade-periods.module';
import { SubjectsModule } from './subjects/subjects.module';
```

- [ ] **Step 2: Register them in the `imports` array**

After `ClassesModule, // V4`:

```typescript
    ClassesModule, // V4
    SubjectsModule, // V6
    GradePeriodsModule, // V6
    EvaluationsModule, // V6
    BulletinsModule, // V6
```

- [ ] **Step 3: Type-check + build**

```bash
pnpm --filter=@ecole-saas/api type-check
pnpm --filter=@ecole-saas/api build
```

Both should PASS.

- [ ] **Step 4: Run the full API test suite**

```bash
pnpm --filter=@ecole-saas/api test
```

Expected: all V1–V6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(v6): register Subjects/GradePeriods/Evaluations/Bulletins modules"
```

---

## Task 11: Web proxies for the 4 new features

**Files:**
- Create: `apps/web/app/api/subjects/[...action]/route.ts`
- Create: `apps/web/app/api/grade-periods/[...action]/route.ts`
- Create: `apps/web/app/api/evaluations/[...action]/route.ts`
- Create: `apps/web/app/api/bulletins/[...action]/route.ts`

- [ ] **Step 1: Inspect the existing classes proxy**

Read `apps/web/app/api/classes/[...action]/route.ts` to understand the exact `GET`/`POST`/`PATCH`/`DELETE` handler shape. The upstream prefix is `/classes`. Each new proxy uses the same pattern, only the upstream prefix changes.

- [ ] **Step 2: Create `subjects` proxy**

Create `apps/web/app/api/subjects/[...action]/route.ts` mirroring the classes proxy with upstream prefix `/subjects`. Export the same set of HTTP methods.

- [ ] **Step 3: Create `grade-periods` proxy**

Create `apps/web/app/api/grade-periods/[...action]/route.ts` mirroring the classes proxy with upstream prefix `/grade-periods`. Export the same set of HTTP methods.

- [ ] **Step 4: Create `evaluations` proxy**

Create `apps/web/app/api/evaluations/[...action]/route.ts` mirroring the classes proxy with upstream prefix `/evaluations`. **Must also export `PUT`** (used by `PUT /evaluations/:id/grades`). If the classes proxy doesn't already define `PUT`, add it in this file by copying the `PATCH` handler and changing `method: 'PUT'`.

- [ ] **Step 5: Create `bulletins` proxy**

Create `apps/web/app/api/bulletins/[...action]/route.ts` mirroring the classes proxy with upstream prefix `/bulletins`. **Important:** `POST /bulletins/generate` returns `application/pdf` (binary), not JSON. In this proxy's `POST` handler, when the upstream `Content-Type` starts with `application/pdf`, stream the response body as-is and propagate `Content-Type`, `Content-Disposition`, and `X-Bulletin-Id` headers verbatim. For all other content types, fall back to the JSON parse-and-return path from the classes proxy.

- [ ] **Step 6: Type-check web**

```bash
pnpm --filter=@ecole-saas/web type-check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/subjects/ apps/web/app/api/grade-periods/ apps/web/app/api/evaluations/ apps/web/app/api/bulletins/
git commit -m "feat(web/v6): REST proxies for subjects/grade-periods/evaluations/bulletins"
```

---

## Task 12: Web page `/classes/[id]/grades`

**Files:**
- Create: `apps/web/app/[locale]/(app)/classes/[id]/grades/page.tsx`
- Create: `apps/web/app/[locale]/(app)/classes/[id]/grades/grades-client.tsx`

- [ ] **Step 1: Create the server page wrapper**

Create `apps/web/app/[locale]/(app)/classes/[id]/grades/page.tsx`:

```tsx
import { GradesClient } from './grades-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string; locale: string };
}

export default function ClassGradesPage({ params }: PageProps) {
  return <GradesClient classId={params.id} />;
}
```

- [ ] **Step 2: Create the client component**

The page must:

1. Fetch the class detail (`GET /api/classes/:id`) → name + level + schoolYear
2. Fetch the tenant students filtered by `classroom === class.name` (`GET /api/students?classroom=<name>`)
3. Fetch subjects (`GET /api/subjects`), grade periods (`GET /api/grade-periods?schoolYear=<year>`), and evaluations for this class & selected period (`GET /api/evaluations?classId=<id>&gradePeriodId=<periodId>`)
4. Let the user pick a grade period (default: the period whose date range contains today, else most recent)
5. Provide a create-evaluation form (subject dropdown, title, date input, maxScore input)
6. For each existing evaluation, fetch `GET /api/evaluations/:id` to get grades, then render a table with one row per student. Each row has a `number` input for the score, `min=0`, `max=evaluation.maxScore`, `step=0.25`. Auto-save on blur via `PUT /api/evaluations/:id/grades` body `{ studentId, score }`.
7. Show a toast / inline notice on save success or on error code (`PERIOD_CLOSED`, `SCORE_OUT_OF_RANGE`, …).
8. Disable inputs when `selectedPeriod.isClosed === true` and show a banner explaining the period is closed.

Create `apps/web/app/[locale]/(app)/classes/[id]/grades/grades-client.tsx`:

```tsx
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface SubjectDto { id: string; name: string }
interface GradePeriodDto { id: string; name: string; schoolYear: string; startDate: string; endDate: string; isClosed: boolean }
interface EvaluationDto { id: string; subjectId: string; gradePeriodId: string; title: string; date: string; maxScore: number }
interface GradeDto { id: string; evaluationId: string; studentId: string; score: number }
interface StudentDto { id: string; firstName: string; lastName: string; classroom: string }
interface ClassDto { id: string; name: string; level: string; schoolYear: string }

async function jsonOk<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let code = 'REQUEST_FAILED';
    try { code = (await r.json()).code ?? code; } catch { /* ignore */ }
    throw new Error(code);
  }
  return r.json();
}

export function GradesClient({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ subjectId: '', title: '', date: '', maxScore: 20 });
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const classQ = useQuery<ClassDto>({
    queryKey: ['class', classId],
    queryFn: () => fetch(`/api/classes/${classId}`).then((r) => jsonOk<ClassDto>(r)),
  });

  const subjectsQ = useQuery<{ items: SubjectDto[] }>({
    queryKey: ['subjects'],
    queryFn: () => fetch('/api/subjects').then((r) => jsonOk<{ items: SubjectDto[] }>(r)),
  });

  const periodsQ = useQuery<{ items: GradePeriodDto[] }>({
    queryKey: ['grade-periods', classQ.data?.schoolYear],
    enabled: !!classQ.data?.schoolYear,
    queryFn: () =>
      fetch(`/api/grade-periods?schoolYear=${classQ.data!.schoolYear}`).then((r) =>
        jsonOk<{ items: GradePeriodDto[] }>(r),
      ),
  });

  const studentsQ = useQuery<{ items: StudentDto[] }>({
    queryKey: ['students-by-classroom', classQ.data?.name],
    enabled: !!classQ.data?.name,
    queryFn: () =>
      fetch(`/api/students?classroom=${encodeURIComponent(classQ.data!.name)}`).then((r) =>
        jsonOk<{ items: StudentDto[] }>(r),
      ),
  });

  const evaluationsQ = useQuery<{ items: EvaluationDto[] }>({
    queryKey: ['evaluations', classId, selectedPeriodId],
    enabled: !!classId && !!selectedPeriodId,
    queryFn: () =>
      fetch(`/api/evaluations?classId=${classId}&gradePeriodId=${selectedPeriodId}`).then((r) =>
        jsonOk<{ items: EvaluationDto[] }>(r),
      ),
  });

  // Auto-select the current period when periods load
  useEffect(() => {
    if (!selectedPeriodId && periodsQ.data?.items?.length) {
      const today = new Date().toISOString().slice(0, 10);
      const current = periodsQ.data.items.find(
        (p) => p.startDate.slice(0, 10) <= today && p.endDate.slice(0, 10) >= today,
      );
      setSelectedPeriodId(current?.id ?? periodsQ.data.items[0].id);
    }
  }, [periodsQ.data, selectedPeriodId]);

  const selectedPeriod = periodsQ.data?.items.find((p) => p.id === selectedPeriodId);
  const isClosed = selectedPeriod?.isClosed ?? false;

  const createEval = useMutation({
    mutationFn: async () => {
      setErrorCode(null);
      const r = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          subjectId: createForm.subjectId,
          gradePeriodId: selectedPeriodId,
          title: createForm.title,
          date: createForm.date,
          maxScore: Number(createForm.maxScore),
        }),
      });
      return jsonOk<EvaluationDto>(r);
    },
    onSuccess: () => {
      setCreateOpen(false);
      setCreateForm({ subjectId: '', title: '', date: '', maxScore: 20 });
      qc.invalidateQueries({ queryKey: ['evaluations', classId, selectedPeriodId] });
    },
    onError: (e: Error) => setErrorCode(e.message),
  });

  const upsertGrade = useMutation({
    mutationFn: async (args: { evaluationId: string; studentId: string; score: number }) => {
      setErrorCode(null);
      const r = await fetch(`/api/evaluations/${args.evaluationId}/grades`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: args.studentId, score: args.score }),
      });
      return jsonOk<GradeDto>(r);
    },
    onSuccess: (_data, args) =>
      qc.invalidateQueries({ queryKey: ['evaluation-detail', args.evaluationId] }),
    onError: (e: Error) => setErrorCode(e.message),
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">
        Notes — {classQ.data?.name} ({classQ.data?.level} {classQ.data?.schoolYear})
      </h1>

      <div className="flex flex-wrap gap-3 items-center">
        <label htmlFor="period" className="font-medium">Période :</label>
        <select
          id="period"
          value={selectedPeriodId ?? ''}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="border rounded px-3 py-1.5"
        >
          {periodsQ.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.schoolYear}) {p.isClosed ? '— clôturée' : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selectedPeriodId || isClosed}
          onClick={() => setCreateOpen((v) => !v)}
          className="ml-auto px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
        >
          + Nouvelle évaluation
        </button>
      </div>

      {isClosed && (
        <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
          Cette période est clôturée — les notes ne sont plus modifiables.
        </div>
      )}

      {errorCode && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">
          Erreur : {errorCode}
        </div>
      )}

      {createOpen && (
        <form
          onSubmit={(e) => { e.preventDefault(); createEval.mutate(); }}
          className="border rounded p-4 space-y-3 bg-gray-50"
        >
          <h2 className="font-semibold">Nouvelle évaluation</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              required
              value={createForm.subjectId}
              onChange={(e) => setCreateForm((f) => ({ ...f, subjectId: e.target.value }))}
              className="border rounded px-3 py-1.5"
            >
              <option value="">— Matière —</option>
              {subjectsQ.data?.items.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              required
              type="text"
              placeholder="Titre (ex: Contrôle chap 3)"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              className="border rounded px-3 py-1.5"
            />
            <input
              required
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
              className="border rounded px-3 py-1.5"
            />
            <input
              required
              type="number"
              min={0.01}
              step={0.5}
              max={1000}
              value={createForm.maxScore}
              onChange={(e) => setCreateForm((f) => ({ ...f, maxScore: Number(e.target.value) }))}
              className="border rounded px-3 py-1.5"
              aria-label="Barème"
            />
          </div>
          <button
            type="submit"
            disabled={createEval.isPending}
            className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-50"
          >
            {createEval.isPending ? 'Création…' : 'Créer'}
          </button>
        </form>
      )}

      <div className="space-y-6">
        {evaluationsQ.data?.items.length === 0 && (
          <p className="text-gray-500">Aucune évaluation pour cette période.</p>
        )}
        {evaluationsQ.data?.items.map((evaluation) => (
          <EvaluationGradesCard
            key={evaluation.id}
            evaluation={evaluation}
            students={studentsQ.data?.items ?? []}
            subjects={subjectsQ.data?.items ?? []}
            isClosed={isClosed}
            onScoreChange={(studentId, score) =>
              upsertGrade.mutate({ evaluationId: evaluation.id, studentId, score })
            }
          />
        ))}
      </div>
    </div>
  );
}

interface EvalDetail { evaluation: EvaluationDto; grades: GradeDto[] }

function EvaluationGradesCard({
  evaluation,
  students,
  subjects,
  isClosed,
  onScoreChange,
}: {
  evaluation: EvaluationDto;
  students: StudentDto[];
  subjects: SubjectDto[];
  isClosed: boolean;
  onScoreChange: (studentId: string, score: number) => void;
}) {
  const detailQ = useQuery<EvalDetail>({
    queryKey: ['evaluation-detail', evaluation.id],
    queryFn: () =>
      fetch(`/api/evaluations/${evaluation.id}`).then((r) => jsonOk<EvalDetail>(r)),
  });

  const subjectName =
    subjects.find((s) => s.id === evaluation.subjectId)?.name ?? evaluation.subjectId;

  const gradeByStudent = new Map<string, number>();
  detailQ.data?.grades.forEach((g) => gradeByStudent.set(g.studentId, g.score));

  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-baseline mb-3">
        <h3 className="font-semibold">
          {evaluation.title} — {subjectName}
        </h3>
        <span className="text-sm text-gray-500">
          {new Date(evaluation.date).toLocaleDateString('fr-FR')} · /{evaluation.maxScore}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="py-1">Élève</th>
            <th className="py-1 w-32 text-right">Note</th>
          </tr>
        </thead>
        <tbody>
          {students.map((st) => {
            const current = gradeByStudent.get(st.id);
            return (
              <tr key={st.id} className="border-t">
                <td className="py-1.5">{st.lastName.toUpperCase()} {st.firstName}</td>
                <td className="py-1.5 text-right">
                  <input
                    type="number"
                    min={0}
                    max={evaluation.maxScore}
                    step={0.25}
                    defaultValue={current ?? ''}
                    disabled={isClosed}
                    aria-label={`Note ${st.lastName} ${st.firstName}`}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v === '') return;
                      const n = Number(v);
                      if (Number.isFinite(n) && n !== current) onScoreChange(st.id, n);
                    }}
                    className="border rounded px-2 py-1 w-24 text-right disabled:bg-gray-100"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + lint**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
```

Expected: PASS.

- [ ] **Step 4: Smoke test in dev**

```bash
pnpm dev
```

Log in as the SCHOOL_ADMIN of a demo tenant. Navigate to `/classes/<id>/grades`. Create an evaluation. Enter a few scores. Refresh — scores persist.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[locale]/(app)/classes/[id]/grades/
git commit -m "feat(web/v6): /classes/[id]/grades — evaluation list + grade entry"
```

---

## Task 13: Web page `/students/[id]/bulletin`

**Files:**
- Create: `apps/web/app/[locale]/(app)/students/[id]/bulletin/page.tsx`
- Create: `apps/web/app/[locale]/(app)/students/[id]/bulletin/bulletin-client.tsx`

- [ ] **Step 1: Create the server page wrapper**

Create `apps/web/app/[locale]/(app)/students/[id]/bulletin/page.tsx`:

```tsx
import { BulletinClient } from './bulletin-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string; locale: string };
}

export default function StudentBulletinPage({ params }: PageProps) {
  return <BulletinClient studentId={params.id} />;
}
```

- [ ] **Step 2: Create the client component**

Create `apps/web/app/[locale]/(app)/students/[id]/bulletin/bulletin-client.tsx`:

```tsx
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface StudentDto { id: string; firstName: string; lastName: string; classroom: string }
interface GradePeriodDto { id: string; name: string; schoolYear: string }

export function BulletinClient({ studentId }: { studentId: string }) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const studentQ = useQuery<StudentDto>({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const r = await fetch(`/api/students/${studentId}`);
      if (!r.ok) throw new Error('STUDENT_LOAD_FAILED');
      return r.json();
    },
  });

  const periodsQ = useQuery<{ items: GradePeriodDto[] }>({
    queryKey: ['grade-periods-all'],
    queryFn: async () => (await fetch('/api/grade-periods')).json(),
  });

  const generateMut = useMutation({
    mutationFn: async (gradePeriodId: string) => {
      setErrorCode(null);
      const r = await fetch('/api/bulletins/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, gradePeriodId }),
      });
      if (!r.ok) {
        let code = 'BULLETIN_FAILED';
        try {
          const body = await r.json();
          code = body.code ?? code;
        } catch {
          /* keep default code */
        }
        throw new Error(code);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const periodName =
        periodsQ.data?.items.find((p) => p.id === gradePeriodId)?.name ?? gradePeriodId;
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin_${studentQ.data?.lastName ?? studentId}_${periodName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => setErrorCode(e.message),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        Bulletin — {studentQ.data?.lastName?.toUpperCase()} {studentQ.data?.firstName}
      </h1>
      <p className="text-sm text-gray-600">Classe : {studentQ.data?.classroom}</p>

      <div className="space-y-3">
        <label htmlFor="period" className="block font-medium">
          Période à éditer
        </label>
        <select
          id="period"
          value={selectedPeriodId ?? ''}
          onChange={(e) => setSelectedPeriodId(e.target.value || null)}
          className="border rounded px-3 py-2 w-full"
        >
          <option value="">— Choisir une période —</option>
          {periodsQ.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.schoolYear})
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!selectedPeriodId || generateMut.isPending}
          onClick={() => selectedPeriodId && generateMut.mutate(selectedPeriodId)}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {generateMut.isPending ? 'Génération…' : 'Générer le bulletin PDF'}
        </button>

        {errorCode && (
          <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">
            Échec : {errorCode}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + lint**

```bash
pnpm --filter=@ecole-saas/web type-check
pnpm --filter=@ecole-saas/web lint
```

Expected: PASS.

- [ ] **Step 4: Smoke test in dev**

Logged in as SCHOOL_ADMIN, navigate to `/students/<id>/bulletin`, choose the period containing the grades from Task 12, click "Générer". A PDF downloads with the computed averages.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/[locale]/(app)/students/[id]/bulletin/
git commit -m "feat(web/v6): /students/[id]/bulletin — generate + download PDF"
```

---

## Task 14: ADR 0012 + roadmap entry

**Files:**
- Create: `docs/adr/0012-v6-pedagogy-bulletins.md`
- Modify: `docs/roadmap.md`

- [ ] **Step 1: Create the ADR**

Create `docs/adr/0012-v6-pedagogy-bulletins.md`:

```markdown
# 0012 — V6 Pédagogie + Bulletins PDF

**Date:** 2026-05-26
**Status:** Accepted (D32)
**Deciders:** User

## Context

Klasso a, à la fin V4, des classes + EDT mais aucun module de notation. V6
introduit le gradebook (Subject, GradePeriod, Evaluation, Grade) ainsi que la
génération de bulletins PDF par élève + période.

## Decision

### Models V6 (D32 lock — server-side PDF via @react-pdf/renderer)

- **`Subject`** — matière référencée par tenant. Unique `(tenantId, name)`. Soft-delete via `deletedAt`.
- **`GradePeriod`** — période de notation (T1/T2/T3 ou S1/S2). Unique `(tenantId, schoolYear, name)`. `isClosed=true` interdit la création/modification de Grade mais n'empêche pas la regénération du bulletin.
- **`Evaluation`** — un contrôle / devoir d'une classe + matière dans une période. `maxScore` libre (échelle quelconque). **Pas de coefficient en V6** (V6-B pour pondération).
- **`Grade`** — note d'un élève à une évaluation. Unique `(evaluationId, studentId)`. `0 ≤ score ≤ evaluation.maxScore`.
- **`Bulletin`** — snapshot Json + métadonnées de génération pour un (élève, période). Unique `(studentId, gradePeriodId)`.

Rejected — modèles plus granulaires (TermAverage, SubjectAverage tables matérialisées) : surcoût migrations sans bénéfice V6, calculs simples à la volée et snapshotés dans `Bulletin.data`.

### Rendu PDF — @react-pdf/renderer (D32 lock)

- Bibliothèque retenue : `@react-pdf/renderer` ^4.x. Server-side, JSX-like, ~200KB, fonctionne sur Railway et Vercel runtime Node.
- `BulletinPdfService.render(props)` enveloppe `renderToBuffer()`. Template React dans `bulletins/templates/bulletin-document.tsx`.
- Le PDF est retourné directement (`Content-Type: application/pdf`) dans la réponse `POST /bulletins/generate` — pas de stockage R2 obligatoire en V6 (V6-B).

Rejected — `puppeteer` / `playwright` (lourd Chromium, problématique serverless), `pdfkit` (bas niveau, mauvais layout), wkhtmltopdf (binaire système).

### Calcul des moyennes

- Moyenne par matière = moyenne arithmétique simple de `(score / maxScore) * 20` sur toutes les notes du student dans cette matière sur la période. **Pas de pondération en V6** — V6-B.
- Moyenne générale = moyenne des moyennes par matière (matières sans note ignorées).
- 0 note → `overallAverage = null`, snapshot subjects = `[]`. PDF affiche "Aucune note enregistrée".

### Students ↔ Class (V6 only)

Pas encore de FK `Student.classId` (V4-B). En attendant, on matche
`student.classroom == class.name && student.tenantId == class.tenantId`.
Trade-off : si la `classroom` string n'a pas été migrée, le bulletin est vide.

### API surface

```
GET    /api/subjects                            list (RW: SCHOOL_ADMIN, R: TEACHER+STAFF)
POST   /api/subjects                            create (SCHOOL_ADMIN)
PATCH  /api/subjects/:id                        update
DELETE /api/subjects/:id                        soft-delete

GET    /api/grade-periods                       list (?schoolYear=)
POST   /api/grade-periods                       create (SCHOOL_ADMIN)
PATCH  /api/grade-periods/:id                   update
POST   /api/grade-periods/:id/close             close period

GET    /api/evaluations                         list (?classId, ?gradePeriodId, ?subjectId)
POST   /api/evaluations                         create (SCHOOL_ADMIN, TEACHER on own classes)
GET    /api/evaluations/:id                     detail + grades
PATCH  /api/evaluations/:id                     update
DELETE /api/evaluations/:id                     delete
PUT    /api/evaluations/:id/grades              upsert grade for one student
DELETE /api/evaluations/:id/grades/:studentId   delete grade

POST   /api/bulletins/generate                  generate PDF (returns application/pdf)
GET    /api/bulletins/:studentId/:periodId/latest  latest bulletin metadata
```

### Tenant isolation

Chaque table V6 a `tenantId` et toutes les queries forcent `tenantId: user.tenantId`. Aucun endpoint cross-tenant — SUPER_ADMIN reporté V11.

### TEACHER scope

Les TEACHER ne peuvent créer/modifier les Evaluation et Grade que sur les Class
où ils ont une ligne `ClassTeacher` (peu importe la matière de cette ligne — granularité
par matière sera V6-B).

## Consequences

**Positive :**
- Stack PDF minimal, déployable partout où Node tourne.
- Snapshot Json côté `Bulletin.data` permet la regénération identique post-publication.
- Modèles isolés des modèles V1–V4 — pas de migration risquée des données existantes.

**Negative :**
- Pas de pondération matière (V6-B) — incomplet pour les écoles utilisant des coefficients.
- Pas de commentaires textuels enseignant (V6-B).
- Pas de notifications parents quand un bulletin est publié (V9 multi-canal).
- Pas d'accès parent à la lecture des notes / bulletin (V6-B).
- Le matching student ↔ class par string `classroom` peut donner un bulletin vide si les classrooms n'ont pas été migrées.

## V6 explicit out-of-scope (V6-B / V9)

- Moyennes pondérées par matière (V6-B)
- Coefficient par évaluation (V6-B)
- Commentaire enseignant sur bulletin (V6-B)
- Notifications push/email parents (V9)
- Accès lecture parent aux notes + téléchargement bulletin (V6-B)
- Persona TEACHER : page "Mes classes" + raccourci saisie (V6-B / V4-B)
- Upload R2 du PDF + URL persistée (V6-B)
- Migration `Student.classId` (V4-B)

## References

- Migration: `apps/api/prisma/migrations/<ts>_v6_pedagogy_bulletins/`
- Backend: `apps/api/src/subjects/`, `grade-periods/`, `evaluations/`, `bulletins/`
- PDF template: `apps/api/src/bulletins/templates/bulletin-document.tsx`
- Frontend: `apps/web/app/[locale]/(app)/classes/[id]/grades/`, `students/[id]/bulletin/`
- Proxies: `apps/web/app/api/{subjects,grade-periods,evaluations,bulletins}/[...action]/route.ts`
```

- [ ] **Step 2: Add V6 row to roadmap**

In `docs/roadmap.md`, in the "Vagues — vue d'ensemble" table, add (after the V4 row):

```markdown
| **V6** | **Pédagogie + Bulletins PDF** : Subject + GradePeriod + Evaluation + Grade + Bulletin Prisma models + 4 NestJS modules + page web `/classes/[id]/grades` (saisie notes par éval) + page web `/students/[id]/bulletin` (génération PDF via @react-pdf/renderer) + ADR 0012. Hors-scope V6-B : pondération matière, commentaires bulletin, accès parent. | ~3j | V4 | ✅ Livré 2026-05-26 |
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0012-v6-pedagogy-bulletins.md docs/roadmap.md
git commit -m "docs(v6): ADR 0012 + roadmap entry"
```

---

## Task 15: Full repo verification + PR

**Files:** none modified — verification + PR.

- [ ] **Step 1: API test suite**

```bash
pnpm --filter=@ecole-saas/api test
```

Expected: all V1–V6 tests pass. V6 contributes ~24 new unit tests (5 subjects + 6 grade-periods + 7 evaluations + 6 bulletins).

- [ ] **Step 2: Lint + type-check on everything**

```bash
pnpm lint
pnpm type-check
```

Both PASS.

- [ ] **Step 3: Full build**

```bash
pnpm build
```

Expected: api + web builds succeed.

- [ ] **Step 4: Web test suite**

```bash
pnpm --filter=@ecole-saas/web test
```

Expected: existing tests pass (no new web unit tests in V6 — pages are TanStack-Query orchestration; behavior covered by manual smoke test).

- [ ] **Step 5: Push the branch + open PR**

```bash
git push -u origin claude/xenodochial-cohen-c3ece0
gh pr create \
  --title "feat(v6): Pédagogie + Bulletins PDF" \
  --body "$(cat <<'EOF'
## Summary

V6 — Gradebook + PDF bulletins.

- Prisma models: `Subject`, `GradePeriod`, `Evaluation`, `Grade`, `Bulletin`
- API modules: `subjects`, `grade-periods`, `evaluations` (+ grades), `bulletins`
- PDF: `@react-pdf/renderer` (D32 lock), server-side, ~200KB
- Web: `/classes/[id]/grades` (saisie notes) + `/students/[id]/bulletin` (génération PDF)
- ADR 0012 + roadmap entry

Out-of-scope V6 (deferred to V6-B / V9): weighted averages, teacher comments,
parent access to grades/bulletin, parent notifications, R2 PDF persistence,
\`Student.classId\` FK (V4-B).

## Test plan

- [ ] \`pnpm --filter=@ecole-saas/api test\` — all unit tests pass (~24 new)
- [ ] \`pnpm lint && pnpm type-check && pnpm build\` — green
- [ ] Manual: log in as SCHOOL_ADMIN, create a subject + grade period, create an evaluation on a class, enter grades, generate bulletin PDF, verify averages
- [ ] Manual: log in as TEACHER assigned to a class → can create evaluations + grades on that class only
- [ ] Manual: log in as TEACHER not assigned → 403 on evaluation creation
- [ ] Manual: close a period → grade upsert returns \`PERIOD_CLOSED\`
- [ ] CI green → auto-merge per CLAUDE.md §9
EOF
)"
```

- [ ] **Step 6: Wait for CI green; auto-merge per CLAUDE.md §9**

Once all CI checks pass:

```bash
gh pr checks --watch
gh pr merge --merge
```

---

## Self-review checklist

- [x] **Spec coverage:** all 5 Prisma models, 4 NestJS modules, 2 web pages, ADR + roadmap → mapped to tasks 1–14
- [x] **Placeholder scan:** no TBD/TODO/"similar to" placeholders — all code blocks are concrete
- [x] **Type consistency:** `SubjectResponseDto.id` matches across DTO/service/tests; `BulletinSnapshotDto.subjects[].subjectId` matches the PDF template `BulletinSubjectEntry.subjectId`; `Evaluation.maxScore` is `Float`/`number` in Prisma + DTO + service + tests; `upsertGrade` signature `(evaluationId, dto, user)` consistent across service + controller + tests
- [x] **D32 locked decision (@react-pdf/renderer)** honored in task 3 install + task 7 template + task 8 service + ADR 0012
- [x] **Hors-scope explicit** in plan header + ADR
- [x] **TDD ordering** — tests written before implementation in tasks 4, 5, 6, 8
