# V2 — Module Élèves CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Livrer CRUD complet Élèves : Backend 7 endpoints (CRUD + bulk-import CSV + photo-upload-url R2) avec RBAC 5 rôles × 7 actions + isolation multi-tenant + Web full CRUD 4 pages sectionnées + Mobile read-only. Première entité métier post-V1.8.

**Architecture:** Prisma `Student` model 15 champs (Sex enum + identité/scolarité/famille/contact/langue/médical light/photo). Backend `StudentsModule` étend `tenant.extension.TENANT_SCOPED_MODELS` pour isolation auto. RBAC : `@Roles()` + service-side scoping pour PARENT. Photo upload réutilise pattern R2 V1.6 tenant-brand. Mobile read-only via Expo Router + NativeWind.

**Tech Stack:** NestJS 10 · Prisma · class-validator · @aws-sdk/client-s3 · Next.js 14 App Router · react-hook-form · Zod · TanStack Query · Expo Router · NativeWind · csv-parse (nouveau dep V2)

**Spec source:** `docs/superpowers/specs/2026-05-25-v2-eleves-module-design.md`
**Branch:** `feat/v2-eleves`
**Merge policy:** CLAUDE.md auto-merge sur CI verte.

---

## File Structure

### Backend — `apps/api/`

| File | Status | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | MODIFY | Add `Sex` enum + `Student` model (15 champs + 3 index) |
| `prisma/migrations/<timestamp>_v2_student/migration.sql` | NEW | Migration générée par Prisma |
| `src/common/prisma/tenant.extension.ts` | MODIFY | Append `'Student'` to `TENANT_SCOPED_MODELS` |
| `src/students/dto/student.dto.ts` | NEW | `CreateStudentDto`, `UpdateStudentDto`, `ListStudentsQueryDto`, `StudentResponseDto` |
| `src/students/dto/bulk-import.dto.ts` | NEW | `BulkImportQueryDto` + `BulkImportResponseDto` |
| `src/students/dto/photo-upload.dto.ts` | NEW | `PhotoUploadUrlDto` + `PhotoUploadResponseDto` |
| `src/students/students.service.ts` | NEW | CRUD + RBAC scoping (PARENT) + soft-delete + audit |
| `src/students/students.service.spec.ts` | NEW | 8 unit tests TDD |
| `src/students/students-bulk-import.service.ts` | NEW | papaparse CSV + zod row + dry-run + tx insert |
| `src/students/students-photo.service.ts` | NEW | R2 signed PUT URL (réutilise `R2Service.signedPutUrl`) |
| `src/students/students.controller.ts` | NEW | 7 endpoints REST |
| `src/students/students.module.ts` | NEW | Register controller + 3 services |
| `src/app.module.ts` | MODIFY | Import `StudentsModule` |
| `test/students.e2e-spec.ts` | NEW | E2E CRUD + RBAC matrix complète + bulk-import + photo |
| `test/multi-tenant-isolation.e2e-spec.ts` | MODIFY | Extend with Student CRUD + bulk-import cross-tenant tests (R10) |
| `package.json` | MODIFY | Add `csv-parse` dependency |

### Frontend Web — `apps/web/`

| File | Status | Responsibility |
|------|--------|---------------|
| `lib/validation/student.schemas.ts` | NEW | Zod `createStudentSchema` + `updateStudentSchema` |
| `lib/api/students.ts` | NEW | Fetch wrappers (7 endpoints) |
| `app/(app)/students/page.tsx` | NEW | Server page (Élèves liste) |
| `app/(app)/students/students-list.tsx` | NEW | Client TanStack Query + search + pagination |
| `app/(app)/students/new/page.tsx` | NEW | Server page (Création) |
| `app/(app)/students/new/create-student-form.tsx` | NEW | Form sectionné (4 sections) + react-hook-form + zod |
| `app/(app)/students/[id]/page.tsx` | NEW | Server page (Détail) |
| `app/(app)/students/[id]/student-detail.tsx` | NEW | Client détail + edit modal + delete |
| `app/(app)/students/bulk-import/page.tsx` | NEW | Server page (Import CSV) |
| `app/(app)/students/bulk-import/bulk-import-form.tsx` | NEW | Drop zone + dry-run preview + confirm |
| `app/(app)/students/components/photo-upload.tsx` | NEW | `<PhotoUpload>` widget (R2 signed PUT + preview + fallback initiales) |
| `app/(app)/app-shell-client.tsx` | MODIFY | Lien "Élèves" dans header |

### Frontend Mobile — `apps/mobile/`

| File | Status | Responsibility |
|------|--------|---------------|
| `lib/api/students.ts` | NEW | Read-only fetch (`listStudents`, `getStudent`) |
| `app/(app)/students/index.tsx` | NEW | FlatList + search + pull-to-refresh |
| `app/(app)/students/[id].tsx` | NEW | ScrollView sectionné read-only |
| `app/(app)/dashboard.tsx` | MODIFY | Tile "Élèves" → /students |

### Docs

| File | Status | Responsibility |
|------|--------|---------------|
| `docs/adr/0006-students-module.md` | NEW | ADR (4 décisions user + alternatives rejetées) |
| `docs/roadmap.md` | MODIFY | V2 row (3j → ~6j) + D24 lock entry |

---

## Self-Review Checklist (à la fin)

1. **Sex enum** : valeurs Prisma `M | F` (cohérence avec spec §3.1)
2. **Soft-delete** : `deletedAt IS NULL` partout dans `list` et `getById`
3. **PARENT scoping** : service-side `WHERE parentEmail = currentUser.email`, JAMAIS client-side
4. **RBAC matrix** : 5 rôles × 7 actions, voir spec §3.5 ; chaque endpoint a son `@Roles()`
5. **Isolation R10** : modèle `Student` ajouté à `TENANT_SCOPED_MODELS` → auto-filter
6. **Audit** : `student.created`, `student.updated`, `student.deleted`, `student.bulk_imported`, `student.medical_notes_accessed`
7. **Type consistency** : DTO API ↔ types web (`StudentSummary`, `CreateStudentResponse`)
8. **Photo MIME whitelist** : `image/jpeg | image/png | image/webp` (3 only)
9. **Bulk-import atomicité** : 1 erreur = 0 insert (transaction Prisma)
10. **Mobile read-only enforced** : pas de bouton create/edit/delete dans `apps/mobile`

---

## Phase A — Prisma migration `Student` + `Sex` enum (0.5j)

### Task A1: Add `Sex` enum + `Student` model to Prisma schema

**Files:** Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add `Sex` enum after `UserRole`**

Locate the `enum UserRole { ... }` block and append immediately after:

```prisma
enum Sex {
  M
  F
}
```

- [ ] **Step 2: Add `Student` model at end of schema (before final closing if any)**

```prisma
model Student {
  id                String     @id // cuid2 (cohérent avec User, Tenant)
  tenantId          String

  // — Identité —
  firstName         String
  lastName          String
  dateOfBirth       DateTime   @db.Date
  sex               Sex
  nationality       String?    // ISO 3166-1 alpha-2 (ex: 'TN', 'FR', 'DZ')

  // — Scolarité —
  classroom         String     // V2: string libre (ex: "CP-A"). V4: relation Class
  enrollmentDate    DateTime   @db.Date @default(now())
  previousSchooling String?    @db.Text

  // — Famille —
  parentEmail       String     // V2: string ref. V3: relation Parent N-N
  siblingsCount     Int        @default(0)

  // — Contact —
  addressLine       String?
  city              String?
  postalCode        String?
  country           String?    @default("TN")

  // — Langue —
  motherTongue      String?    // ISO 639-1 (ex: 'ar', 'fr', 'en')

  // — Santé (light V2, médical strict V8) —
  medicalNotes      String?    @db.Text // warning RGPD côté UI (cf. R4 spec)

  // — Photo —
  photoUrl          String?    // R2 public URL

  // — Méta —
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
  deletedAt         DateTime?  // soft-delete

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, lastName])
  @@index([tenantId, classroom])
  @@index([tenantId, parentEmail])
  @@map("students")
}
```

- [ ] **Step 3: Add reverse relation on Tenant**

Locate `model Tenant` and add inside the relations block:

```prisma
  students      Student[]
```

(Adjacent to `auditLogs AuditLog[]`.)

- [ ] **Step 4: Generate Prisma Client**

```bash
pnpm --filter=@ecole-saas/api prisma generate
```

Expected: `✔ Generated Prisma Client`. No type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(api/students): Sex enum + Student model in Prisma schema"
```

---

### Task A2: Generate migration `v2_student`

**Files:** New (auto-generated): `apps/api/prisma/migrations/<timestamp>_v2_student/migration.sql`

- [ ] **Step 1: Run migration in dev**

```bash
pnpm --filter=@ecole-saas/api prisma migrate dev --name v2_student
```

Expected output : `Applying migration 20260525XXXXXX_v2_student` + `Your database is now in sync with your schema.`

- [ ] **Step 2: Verify migration file generated**

```bash
ls apps/api/prisma/migrations | grep v2_student
```

Should print one entry like `20260525120000_v2_student`. Inspect `migration.sql` :

```bash
cat apps/api/prisma/migrations/*v2_student*/migration.sql
```

Expected: `CREATE TYPE "Sex"`, `CREATE TABLE "students"`, 3 `CREATE INDEX` lines.

- [ ] **Step 3: Verify seed still applies cleanly**

```bash
pnpm --filter=@ecole-saas/api prisma db seed
```

Expected: existing seeds still work (no Student data in seed yet — kept minimal).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/migrations/
git commit -m "feat(api/students): Prisma migration v2_student"
```

---

### Task A3: Extend `TENANT_SCOPED_MODELS`

**Files:** Modify: `apps/api/src/common/prisma/tenant.extension.ts`

- [ ] **Step 1: Append `'Student'` to the constant**

Locate :
```typescript
export const TENANT_SCOPED_MODELS = ['User', 'RefreshToken', 'AuditLog'] as const;
```

Replace with :
```typescript
export const TENANT_SCOPED_MODELS = ['User', 'RefreshToken', 'AuditLog', 'Student'] as const;
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter=@ecole-saas/api type-check
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/prisma/tenant.extension.ts
git commit -m "feat(api/students): scope Student model via Prisma tenant.extension"
```

---

## Phase B — Backend StudentsService + Controller + DTOs + tests (1.5j)

### Task B1: DTOs (`student.dto.ts`)

**Files:** Create: `apps/api/src/students/dto/student.dto.ts`

- [ ] **Step 1: Create file**

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Sex } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_LANG2 = /^[a-z]{2}$/;

export class CreateStudentDto {
  // — Identité —
  @ApiProperty({ maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;

  @ApiProperty({ format: 'date', example: '2017-09-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  sex!: Sex;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2', example: 'TN' })
  @IsOptional()
  @Matches(ISO_ALPHA2, { message: 'nationality doit être un code ISO 3166-1 alpha-2' })
  nationality?: string;

  // — Scolarité —
  @ApiProperty({ maxLength: 50, example: 'CP-A' })
  @IsString() @MinLength(1) @MaxLength(50)
  classroom!: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString() @MaxLength(2000)
  previousSchooling?: string;

  // — Famille —
  @ApiProperty({ maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  parentEmail!: string;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt() @Min(0)
  siblingsCount?: number;

  // — Contact —
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional() @IsString() @MaxLength(200)
  addressLine?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional() @IsString() @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2', default: 'TN' })
  @IsOptional()
  @Matches(ISO_ALPHA2, { message: 'country doit être un code ISO 3166-1 alpha-2' })
  country?: string;

  // — Langue —
  @ApiPropertyOptional({ description: 'ISO 639-1', example: 'ar' })
  @IsOptional()
  @Matches(ISO_LANG2, { message: 'motherTongue doit être un code ISO 639-1' })
  motherTongue?: string;

  // — Santé (light) —
  @ApiPropertyOptional({ maxLength: 2000, description: '⚠️ PHI light — RGPD warning UI requis' })
  @IsOptional() @IsString() @MaxLength(2000)
  medicalNotes?: string;

  // — Photo —
  @ApiPropertyOptional({ description: 'URL R2 publique (set post-upload)' })
  @IsOptional() @IsString() @MaxLength(500)
  photoUrl?: string;
}

export class UpdateStudentDto extends PartialType(CreateStudentDto) {}

export class ListStudentsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: 'ILIKE sur firstName + lastName' })
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter exact classroom' })
  @IsOptional() @IsString() @MaxLength(50)
  classroom?: string;
}

export class StudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ format: 'date' }) dateOfBirth!: string;
  @ApiProperty({ enum: Sex }) sex!: Sex;
  @ApiProperty({ nullable: true }) nationality!: string | null;
  @ApiProperty() classroom!: string;
  @ApiProperty({ format: 'date' }) enrollmentDate!: string;
  @ApiProperty({ nullable: true }) previousSchooling!: string | null;
  @ApiProperty() parentEmail!: string;
  @ApiProperty() siblingsCount!: number;
  @ApiProperty({ nullable: true }) addressLine!: string | null;
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ nullable: true }) postalCode!: string | null;
  @ApiProperty({ nullable: true }) country!: string | null;
  @ApiProperty({ nullable: true }) motherTongue!: string | null;
  @ApiProperty({ nullable: true }) medicalNotes!: string | null;
  @ApiProperty({ nullable: true }) photoUrl!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ListStudentsResponseDto {
  @ApiProperty({ type: [StudentResponseDto] }) data!: StudentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/students/dto/student.dto.ts
git commit -m "feat(api/students): CreateStudentDto + UpdateStudentDto + List + Response"
```

---

### Task B2: `StudentsService` (TDD)

**Files:**
- Test: `apps/api/src/students/students.service.spec.ts`
- Create: `apps/api/src/students/students.service.ts`

- [ ] **Step 1: Write the failing spec FIRST**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Sex, UserRole } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { StudentsService } from './students.service';

const META = { ip: '127.0.0.1', userAgent: 'jest' };

const SAMPLE_DTO = {
  firstName: 'Amine',
  lastName: 'Ben Salah',
  dateOfBirth: '2017-09-15',
  sex: Sex.M,
  classroom: 'CP-A',
  parentEmail: 'parent@demo.tn',
};

const FAKE_STUDENT = {
  id: 's1',
  tenantId: 't1',
  ...SAMPLE_DTO,
  dateOfBirth: new Date('2017-09-15'),
  enrollmentDate: new Date('2026-05-25'),
  previousSchooling: null,
  siblingsCount: 0,
  nationality: null,
  addressLine: null,
  city: null,
  postalCode: null,
  country: 'TN',
  motherTongue: null,
  medicalNotes: null,
  photoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: any;
  let tenantCtx: any;

  beforeEach(async () => {
    prisma = {
      student: {
        create: jest.fn().mockResolvedValue(FAKE_STUDENT),
        findMany: jest.fn().mockResolvedValue([FAKE_STUDENT]),
        findFirst: jest.fn().mockResolvedValue(FAKE_STUDENT),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ ...FAKE_STUDENT, lastName: 'Updated' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
    };
    tenantCtx = { getTenantId: jest.fn().mockReturnValue('t1') };

    const mod = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantCtx },
      ],
    }).compile();
    service = mod.get(StudentsService);
  });

  const adminUser = { id: 'u-admin', tenantId: 't1', role: UserRole.SCHOOL_ADMIN, email: 'admin@demo.tn' };
  const teacherUser = { id: 'u-teacher', tenantId: 't1', role: UserRole.TEACHER, email: 'teacher@demo.tn' };
  const parentUser = { id: 'u-parent', tenantId: 't1', role: UserRole.PARENT, email: 'parent@demo.tn' };
  const staffUser = { id: 'u-staff', tenantId: 't1', role: UserRole.STAFF, email: 'staff@demo.tn' };

  it('create: SCHOOL_ADMIN creates student + audit log', async () => {
    const res = await service.create(SAMPLE_DTO as any, adminUser as any, META);
    expect(prisma.student.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(res.firstName).toBe('Amine');
  });

  it('list: SCHOOL_ADMIN sees all (no parentEmail filter)', async () => {
    await service.list({ page: 1, pageSize: 20 }, adminUser as any);
    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.parentEmail).toBeUndefined();
    expect(where.deletedAt).toBeNull();
  });

  it('list: PARENT scoped by parentEmail = user.email', async () => {
    await service.list({ page: 1, pageSize: 20 }, parentUser as any);
    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.parentEmail).toBe('parent@demo.tn');
  });

  it('list: TEACHER + STAFF see all', async () => {
    await service.list({}, teacherUser as any);
    let where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.parentEmail).toBeUndefined();
    await service.list({}, staffUser as any);
    where = prisma.student.findMany.mock.calls[1][0].where;
    expect(where.parentEmail).toBeUndefined();
  });

  it('list: search applies ILIKE on firstName + lastName', async () => {
    await service.list({ search: 'amine' }, adminUser as any);
    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { firstName: { contains: 'amine', mode: 'insensitive' } },
      { lastName: { contains: 'amine', mode: 'insensitive' } },
    ]);
  });

  it('getById: PARENT denied when parentEmail mismatch', async () => {
    prisma.student.findFirst.mockResolvedValueOnce({ ...FAKE_STUDENT, parentEmail: 'other@x.tn' });
    await expect(service.getById('s1', parentUser as any)).rejects.toThrow(ForbiddenException);
  });

  it('getById: throws NotFoundException when null', async () => {
    prisma.student.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('s1', adminUser as any)).rejects.toThrow(NotFoundException);
  });

  it('update: SCHOOL_ADMIN updates + audit log', async () => {
    const res = await service.update('s1', { lastName: 'Updated' } as any, adminUser as any, META);
    expect(prisma.student.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'student.updated' }) }),
    );
    expect(res.lastName).toBe('Updated');
  });

  it('softDelete: sets deletedAt + audit log', async () => {
    await service.softDelete('s1', adminUser as any, META);
    const call = prisma.student.update.mock.calls[0][0];
    expect(call.data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'student.deleted' }) }),
    );
  });
});
```

- [ ] **Step 2: Run spec — verify FAIL**

```bash
pnpm --filter=@ecole-saas/api test -- students.service.spec
```
Expected: failure `Cannot find module './students.service'`.

- [ ] **Step 3: Implement `students.service.ts`**

```typescript
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { RequestMeta } from '../auth/utils/request-meta.utils';

import {
  CreateStudentDto,
  ListStudentsQueryDto,
  ListStudentsResponseDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './dto/student.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCtx: TenantContextService,
  ) {}

  async create(
    dto: CreateStudentDto,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<StudentResponseDto> {
    const tenantId = this.requireTenantId(currentUser);
    const id = createId();

    const student = await this.prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          id,
          tenantId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          dateOfBirth: new Date(dto.dateOfBirth),
          sex: dto.sex,
          nationality: dto.nationality ?? null,
          classroom: dto.classroom.trim(),
          enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : new Date(),
          previousSchooling: dto.previousSchooling ?? null,
          parentEmail: dto.parentEmail.trim().toLowerCase(),
          siblingsCount: dto.siblingsCount ?? 0,
          addressLine: dto.addressLine ?? null,
          city: dto.city ?? null,
          postalCode: dto.postalCode ?? null,
          country: dto.country ?? 'TN',
          motherTongue: dto.motherTongue ?? null,
          medicalNotes: dto.medicalNotes ?? null,
          photoUrl: dto.photoUrl ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          id: createId(),
          action: 'student.created',
          resource: 'student',
          tenantId,
          userId: currentUser.id,
          metadata: { studentId: id, classroom: dto.classroom, parentEmail: dto.parentEmail },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
      return created;
    });

    return this.toResponse(student);
  }

  async list(
    query: ListStudentsQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListStudentsResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const where: Prisma.StudentWhereInput = { deletedAt: null };
    if (query.classroom) where.classroom = query.classroom;
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // RBAC scoping : PARENT see only their children
    if (currentUser.role === UserRole.PARENT) {
      where.parentEmail = currentUser.email.toLowerCase();
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: data.map((s) => this.toResponse(s)),
      total,
      page,
      pageSize,
    };
  }

  async getById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<StudentResponseDto> {
    const student = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }
    if (
      currentUser.role === UserRole.PARENT &&
      student.parentEmail.toLowerCase() !== currentUser.email.toLowerCase()
    ) {
      throw new ForbiddenException({ code: 'STUDENT_NOT_YOURS' });
    }
    return this.toResponse(student);
  }

  async update(
    id: string,
    dto: UpdateStudentDto,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<StudentResponseDto> {
    const tenantId = this.requireTenantId(currentUser);
    const existing = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    const data: Prisma.StudentUpdateInput = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.dateOfBirth !== undefined) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.sex !== undefined) data.sex = dto.sex;
    if (dto.nationality !== undefined) data.nationality = dto.nationality;
    if (dto.classroom !== undefined) data.classroom = dto.classroom.trim();
    if (dto.enrollmentDate !== undefined) data.enrollmentDate = new Date(dto.enrollmentDate);
    if (dto.previousSchooling !== undefined) data.previousSchooling = dto.previousSchooling;
    if (dto.parentEmail !== undefined) data.parentEmail = dto.parentEmail.trim().toLowerCase();
    if (dto.siblingsCount !== undefined) data.siblingsCount = dto.siblingsCount;
    if (dto.addressLine !== undefined) data.addressLine = dto.addressLine;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.postalCode !== undefined) data.postalCode = dto.postalCode;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.motherTongue !== undefined) data.motherTongue = dto.motherTongue;
    if (dto.medicalNotes !== undefined) data.medicalNotes = dto.medicalNotes;
    if (dto.photoUrl !== undefined) data.photoUrl = dto.photoUrl;

    const updated = await this.prisma.student.update({ where: { id }, data });

    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'student.updated',
          resource: 'student',
          tenantId,
          userId: currentUser.id,
          metadata: { studentId: id, changedFields: Object.keys(dto) },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`audit student.updated failed: ${String(err)}`);
    }

    return this.toResponse(updated);
  }

  async softDelete(
    id: string,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<void> {
    const tenantId = this.requireTenantId(currentUser);
    const existing = await this.prisma.student.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'student.deleted',
          resource: 'student',
          tenantId,
          userId: currentUser.id,
          metadata: { studentId: id },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`audit student.deleted failed: ${String(err)}`);
    }
  }

  private requireTenantId(currentUser: AuthenticatedUser): string {
    const tid = currentUser.tenantId ?? this.tenantCtx.getTenantId();
    if (!tid) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    return tid;
  }

  private toResponse(s: {
    id: string;
    tenantId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    sex: 'M' | 'F';
    nationality: string | null;
    classroom: string;
    enrollmentDate: Date;
    previousSchooling: string | null;
    parentEmail: string;
    siblingsCount: number;
    addressLine: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    motherTongue: string | null;
    medicalNotes: string | null;
    photoUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): StudentResponseDto {
    return {
      id: s.id,
      tenantId: s.tenantId,
      firstName: s.firstName,
      lastName: s.lastName,
      dateOfBirth: s.dateOfBirth.toISOString().slice(0, 10),
      sex: s.sex as StudentResponseDto['sex'],
      nationality: s.nationality,
      classroom: s.classroom,
      enrollmentDate: s.enrollmentDate.toISOString().slice(0, 10),
      previousSchooling: s.previousSchooling,
      parentEmail: s.parentEmail,
      siblingsCount: s.siblingsCount,
      addressLine: s.addressLine,
      city: s.city,
      postalCode: s.postalCode,
      country: s.country,
      motherTongue: s.motherTongue,
      medicalNotes: s.medicalNotes,
      photoUrl: s.photoUrl,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Run spec — verify PASS**

```bash
pnpm --filter=@ecole-saas/api test -- students.service.spec
```
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/students/students.service.ts apps/api/src/students/students.service.spec.ts
git commit -m "feat(api/students): StudentsService with RBAC scoping + 9 unit tests"
```

---

### Task B3: `StudentsController`

**Files:** Create: `apps/api/src/students/students.controller.ts`

- [ ] **Step 1: Create file**

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
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  ListStudentsResponseDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './dto/student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth('access-token')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a student (SCHOOL_ADMIN only)' })
  @ApiResponse({ status: 201, type: StudentResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentDto,
    @Req() req: Request,
  ): Promise<StudentResponseDto> {
    return this.students.create(dto, user, getRequestMeta(req));
  }

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STAFF)
  @ApiOperation({ summary: 'List students (RBAC-scoped : PARENT sees own children only)' })
  @ApiResponse({ status: 200, type: ListStudentsResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStudentsQueryDto,
  ): Promise<ListStudentsResponseDto> {
    return this.students.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STAFF)
  @ApiOperation({ summary: 'Get student detail (PARENT must match parentEmail)' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<StudentResponseDto> {
    return this.students.getById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Partial update (SCHOOL_ADMIN only)' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: Request,
  ): Promise<StudentResponseDto> {
    return this.students.update(id, dto, user, getRequestMeta(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft-delete student (SCHOOL_ADMIN only)' })
  @ApiResponse({ status: 204 })
  async softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.students.softDelete(id, user, getRequestMeta(req));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/students/students.controller.ts
git commit -m "feat(api/students): StudentsController — 5 CRUD endpoints with RBAC"
```

---

### Task B4: `StudentsModule`

**Files:** Create: `apps/api/src/students/students.module.ts`

- [ ] **Step 1: Create file** (bulk-import + photo services added in phases C/D)

```typescript
import { Module } from '@nestjs/common';

import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/students/students.module.ts
git commit -m "feat(api/students): StudentsModule"
```

---

### Task B5: Register in `AppModule`

**Files:** Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Add import + register**

Add import (alphabetical with existing module imports):

```typescript
import { StudentsModule } from './students/students.module';
```

In the `imports: [...]` array, append `StudentsModule`.

- [ ] **Step 2: Type-check + boot smoke**

```bash
pnpm --filter=@ecole-saas/api type-check
pnpm --filter=@ecole-saas/api build
```
Expected: 0 errors. NestJS startup will register `/api/students/*` routes (verify via Swagger later).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api/students): register StudentsModule in AppModule"
```

---

### Task B6: E2E spec — CRUD + RBAC matrix

**Files:** Create: `apps/api/test/students.e2e-spec.ts`

- [ ] **Step 1: Create spec**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

import { AppModule } from '../src/app.module';

const PASSWORD = 'v2-students-test-1234!';

interface SeedUser { id: string; email: string; tenantId: string; role: UserRole }
interface Seed { tenantA: string; tenantB: string; adminA: SeedUser; teacherA: SeedUser; parentA: SeedUser; staffA: SeedUser; adminB: SeedUser; studentsA: string[]; studentBId: string }

async function seed(prisma: PrismaClient): Promise<Seed> {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const tenantA = createId();
  const tenantB = createId();
  await prisma.tenant.createMany({
    data: [
      { id: tenantA, name: 'V2 Tenant A', slug: 'v2-tenant-a', type: 'PRIMARY_SCHOOL' },
      { id: tenantB, name: 'V2 Tenant B', slug: 'v2-tenant-b', type: 'PRIMARY_SCHOOL' },
    ],
  });

  const mkUser = async (tid: string, role: UserRole, email: string): Promise<SeedUser> => {
    const id = createId();
    await prisma.user.create({
      data: { id, tenantId: tid, email, passwordHash: hash, firstName: 'V2', lastName: role, role },
    });
    return { id, email, tenantId: tid, role };
  };

  const adminA = await mkUser(tenantA, UserRole.SCHOOL_ADMIN, 'admin-a@v2-test.tn');
  const teacherA = await mkUser(tenantA, UserRole.TEACHER, 'teacher-a@v2-test.tn');
  const parentA = await mkUser(tenantA, UserRole.PARENT, 'parent-a@v2-test.tn');
  const staffA = await mkUser(tenantA, UserRole.STAFF, 'staff-a@v2-test.tn');
  const adminB = await mkUser(tenantB, UserRole.SCHOOL_ADMIN, 'admin-b@v2-test.tn');

  // 3 students in tenant A : 1 belongs to parentA, 2 don't
  const studentsA = [createId(), createId(), createId()];
  await prisma.student.createMany({
    data: [
      { id: studentsA[0], tenantId: tenantA, firstName: 'Amine', lastName: 'Ben Salah', dateOfBirth: new Date('2017-09-15'), sex: 'M', classroom: 'CP-A', parentEmail: parentA.email },
      { id: studentsA[1], tenantId: tenantA, firstName: 'Sarra', lastName: 'Trabelsi', dateOfBirth: new Date('2018-03-10'), sex: 'F', classroom: 'CP-A', parentEmail: 'other@v2-test.tn' },
      { id: studentsA[2], tenantId: tenantA, firstName: 'Yassine', lastName: 'Khaled', dateOfBirth: new Date('2017-06-22'), sex: 'M', classroom: 'CP-B', parentEmail: 'other@v2-test.tn' },
    ],
  });

  // 1 student in tenant B — for isolation test
  const studentBId = createId();
  await prisma.student.create({
    data: { id: studentBId, tenantId: tenantB, firstName: 'Other', lastName: 'Tenant', dateOfBirth: new Date('2017-01-01'), sex: 'M', classroom: 'CE1', parentEmail: 'p@b.tn' },
  });

  return { tenantA, tenantB, adminA, teacherA, parentA, staffA, adminB, studentsA, studentBId };
}

async function login(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return res.body.accessToken;
}

describe('Students (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let s: Seed;
  let adminAToken: string;
  let teacherAToken: string;
  let parentAToken: string;
  let staffAToken: string;
  let adminBToken: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    prisma = new PrismaClient();
    s = await seed(prisma);
    adminAToken = await login(app, s.adminA.email);
    teacherAToken = await login(app, s.teacherA.email);
    parentAToken = await login(app, s.parentA.email);
    staffAToken = await login(app, s.staffA.email);
    adminBToken = await login(app, s.adminB.email);
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { tenantId: { in: [s.tenantA, s.tenantB] } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { endsWith: '@v2-test.tn' } } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [s.tenantA, s.tenantB] } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: '@v2-test.tn' } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [s.tenantA, s.tenantB] } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('SCHOOL_ADMIN creates a student', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        firstName: 'Nour',
        lastName: 'Mhiri',
        dateOfBirth: '2018-11-02',
        sex: 'F',
        classroom: 'GS',
        parentEmail: 'parent-new@v2-test.tn',
      })
      .expect(201);
    expect(res.body.firstName).toBe('Nour');
    expect(res.body.tenantId).toBe(s.tenantA);
  });

  it('TEACHER lists all students of their tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${teacherAToken}`)
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it('PARENT sees only their child', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${parentAToken}`)
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].parentEmail).toBe(s.parentA.email);
  });

  it('STAFF sees all (read-only)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${staffAToken}`)
      .expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(3);
  });

  it('PARENT cannot read another tenant student', async () => {
    await request(app.getHttpServer())
      .get(`/api/students/${s.studentBId}`)
      .set('Authorization', `Bearer ${parentAToken}`)
      .expect(404);
  });

  it('Tenant A SCHOOL_ADMIN cannot read a tenant B student (isolation)', async () => {
    await request(app.getHttpServer())
      .get(`/api/students/${s.studentBId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(404);
  });

  it('PARENT denied read of sibling-class student (parentEmail mismatch → 403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/students/${s.studentsA[1]}`)
      .set('Authorization', `Bearer ${parentAToken}`)
      .expect(403);
  });

  it('SCHOOL_ADMIN updates a student', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/students/${s.studentsA[0]}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ classroom: 'CP-B' })
      .expect(200);
    expect(res.body.classroom).toBe('CP-B');
  });

  it('TEACHER forbidden from update', async () => {
    await request(app.getHttpServer())
      .patch(`/api/students/${s.studentsA[0]}`)
      .set('Authorization', `Bearer ${teacherAToken}`)
      .send({ classroom: 'XXX' })
      .expect(403);
  });

  it('SCHOOL_ADMIN soft-deletes a student', async () => {
    await request(app.getHttpServer())
      .delete(`/api/students/${s.studentsA[2]}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(204);
    const row = await prisma.student.findUnique({ where: { id: s.studentsA[2] } });
    expect(row?.deletedAt).not.toBeNull();
  });

  it('PARENT forbidden from create', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${parentAToken}`)
      .send({ firstName: 'X', lastName: 'Y', dateOfBirth: '2018-01-01', sex: 'M', classroom: 'X', parentEmail: 'x@y.tn' })
      .expect(403);
  });

  it('Search ILIKE on lastName', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students?search=trabelsi')
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(200);
    expect(res.body.data.some((d: any) => d.lastName === 'Trabelsi')).toBe(true);
  });

  it('admin B cannot patch a tenant A student (404 — isolation)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/students/${s.studentsA[0]}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ classroom: 'HACK' })
      .expect(404);
  });
});
```

- [ ] **Step 2: Run e2e**

```bash
pnpm --filter=@ecole-saas/api test -- students.e2e-spec
```
Expected: all green on Linux CI. Local Windows may need `pnpm --filter=@ecole-saas/api test:e2e` script.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/students.e2e-spec.ts
git commit -m "test(api/students): e2e — CRUD + RBAC matrix + isolation"
```

---

## Phase C — Bulk CSV import (0.5j)

### Task C1: Add `csv-parse` dependency

**Files:** Modify: `apps/api/package.json`

- [ ] **Step 1: Add dep**

```bash
pnpm --filter=@ecole-saas/api add csv-parse
```

Verify `apps/api/package.json` now contains `"csv-parse": "^5.x.x"` (~50KB gzipped, well under CLAUDE.md 100KB threshold).

- [ ] **Step 2: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add csv-parse dependency for V2 bulk import"
```

---

### Task C2: `StudentsBulkImportService`

**Files:** Create: `apps/api/src/students/students-bulk-import.service.ts`

- [ ] **Step 1: Create file**

```typescript
import { Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { parse } from 'csv-parse/sync';
import { Prisma, Sex } from '@prisma/client';
import { z } from 'zod';

import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { RequestMeta } from '../auth/utils/request-meta.utils';

const MAX_ROWS = 1000;
const MAX_BYTES = 5 * 1024 * 1024;

const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_LANG2 = /^[a-z]{2}$/;

const rowSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD requis'),
  sex: z.enum([Sex.M, Sex.F]),
  classroom: z.string().min(1).max(50),
  parentEmail: z.string().email(),
  nationality: z.string().regex(ISO_ALPHA2).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().regex(ISO_ALPHA2).optional().or(z.literal('')),
  motherTongue: z.string().regex(ISO_LANG2).optional().or(z.literal('')),
  siblingsCount: z.coerce.number().int().min(0).optional(),
});

export type CsvRowError = { row: number; message: string };

export interface BulkImportResult {
  imported: number;
  valid: number;
  errors: CsvRowError[];
  dryRun: boolean;
}

@Injectable()
export class StudentsBulkImportService {
  private readonly logger = new Logger(StudentsBulkImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importCsv(
    csvBuffer: Buffer,
    dryRun: boolean,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<BulkImportResult> {
    if (csvBuffer.byteLength > MAX_BYTES) {
      throw new PayloadTooLargeException({ code: 'CSV_TOO_LARGE', message: `Fichier > ${MAX_BYTES / 1024 / 1024}MB` });
    }

    const tenantId = currentUser.tenantId;
    if (!tenantId) throw new PayloadTooLargeException({ code: 'TENANT_REQUIRED' });

    let records: Record<string, string>[];
    try {
      records = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch (err) {
      return { imported: 0, valid: 0, errors: [{ row: 0, message: `CSV malformé : ${String(err)}` }], dryRun };
    }

    if (records.length > MAX_ROWS) {
      throw new PayloadTooLargeException({ code: 'CSV_TOO_MANY_ROWS', message: `Max ${MAX_ROWS} lignes par upload` });
    }

    const errors: CsvRowError[] = [];
    const validRows: Prisma.StudentCreateManyInput[] = [];
    records.forEach((row, idx) => {
      const parsed = rowSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({
          row: idx + 2, // +2 = header line is 1, data starts line 2
          message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
        return;
      }
      const r = parsed.data;
      validRows.push({
        id: createId(),
        tenantId,
        firstName: r.firstName,
        lastName: r.lastName,
        dateOfBirth: new Date(r.dateOfBirth),
        sex: r.sex,
        classroom: r.classroom,
        parentEmail: r.parentEmail.toLowerCase(),
        nationality: r.nationality ? r.nationality : null,
        city: r.city ? r.city : null,
        country: r.country ? r.country : 'TN',
        motherTongue: r.motherTongue ? r.motherTongue : null,
        siblingsCount: r.siblingsCount ?? 0,
      });
    });

    if (dryRun) {
      return { imported: 0, valid: validRows.length, errors, dryRun: true };
    }

    if (errors.length > 0) {
      return { imported: 0, valid: validRows.length, errors, dryRun: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.createMany({ data: validRows });
      await tx.auditLog.create({
        data: {
          id: createId(),
          action: 'student.bulk_imported',
          resource: 'student',
          tenantId,
          userId: currentUser.id,
          metadata: { rowCount: validRows.length },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });

    return { imported: validRows.length, valid: validRows.length, errors: [], dryRun: false };
  }
}
```

- [ ] **Step 2: Register in `StudentsModule`**

Update `apps/api/src/students/students.module.ts` :

```typescript
import { Module } from '@nestjs/common';

import { StudentsBulkImportService } from './students-bulk-import.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentsBulkImportService],
  exports: [StudentsService],
})
export class StudentsModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/students/students-bulk-import.service.ts apps/api/src/students/students.module.ts
git commit -m "feat(api/students): StudentsBulkImportService with csv-parse + zod row validation"
```

---

### Task C3: Bulk-import controller endpoint + DTO

**Files:**
- Create: `apps/api/src/students/dto/bulk-import.dto.ts`
- Modify: `apps/api/src/students/students.controller.ts`

- [ ] **Step 1: Create DTO**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class BulkImportResponseDto {
  @ApiProperty() imported!: number;
  @ApiProperty() valid!: number;
  @ApiProperty({
    description: 'Errors row-by-row (row = CSV line number, 1-indexed including header)',
    type: 'array',
    items: { type: 'object', properties: { row: { type: 'number' }, message: { type: 'string' } } },
  })
  errors!: { row: number; message: string }[];
  @ApiProperty() dryRun!: boolean;
}
```

- [ ] **Step 2: Modify controller — add endpoint**

Add imports at top of `students.controller.ts` :

```typescript
import { Query as Q, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { StudentsBulkImportService } from './students-bulk-import.service';
import { BulkImportResponseDto } from './dto/bulk-import.dto';
```

Add to constructor :

```typescript
constructor(
  private readonly students: StudentsService,
  private readonly bulkImport: StudentsBulkImportService,
) {}
```

Add endpoint before `@Get()` :

```typescript
@Post('bulk-import')
@HttpCode(HttpStatus.OK)
@Roles(UserRole.SCHOOL_ADMIN)
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
@ApiConsumes('multipart/form-data')
@ApiOperation({ summary: 'Bulk import students from CSV (SCHOOL_ADMIN only)' })
@ApiResponse({ status: 200, type: BulkImportResponseDto })
async bulkImportCsv(
  @CurrentUser() user: AuthenticatedUser,
  @UploadedFile() file: Express.Multer.File,
  @Q('dryRun') dryRun: string,
  @Req() req: Request,
): Promise<BulkImportResponseDto> {
  const isDryRun = dryRun !== 'false';
  return this.bulkImport.importCsv(file.buffer, isDryRun, user, getRequestMeta(req));
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter=@ecole-saas/api type-check
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/students/dto/bulk-import.dto.ts apps/api/src/students/students.controller.ts
git commit -m "feat(api/students): POST /students/bulk-import (multipart CSV + dry-run)"
```

---

### Task C4: E2E test bulk-import

**Files:** Modify: `apps/api/test/students.e2e-spec.ts`

- [ ] **Step 1: Append 3 tests at end of `describe`**

```typescript
it('Bulk import dry-run returns counts without inserting', async () => {
  const csv = [
    'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
    'Imp,One,2017-01-01,M,CM1,parent1@v2-test.tn',
    'Imp,Two,2018-05-05,F,CM1,parent2@v2-test.tn',
  ].join('\n');
  const beforeCount = await prisma.student.count({ where: { tenantId: s.tenantA, lastName: 'One' } });
  const res = await request(app.getHttpServer())
    .post('/api/students/bulk-import?dryRun=true')
    .set('Authorization', `Bearer ${adminAToken}`)
    .attach('file', Buffer.from(csv), 'students.csv')
    .expect(200);
  expect(res.body.imported).toBe(0);
  expect(res.body.valid).toBe(2);
  expect(res.body.errors).toHaveLength(0);
  const afterCount = await prisma.student.count({ where: { tenantId: s.tenantA, lastName: 'One' } });
  expect(afterCount).toBe(beforeCount); // no insert
});

it('Bulk import commits when dryRun=false and rows valid', async () => {
  const csv = [
    'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
    'Imp,Three,2017-01-01,M,CM2,parent3@v2-test.tn',
  ].join('\n');
  const res = await request(app.getHttpServer())
    .post('/api/students/bulk-import?dryRun=false')
    .set('Authorization', `Bearer ${adminAToken}`)
    .attach('file', Buffer.from(csv), 'students.csv')
    .expect(200);
  expect(res.body.imported).toBe(1);
  const row = await prisma.student.findFirst({ where: { tenantId: s.tenantA, lastName: 'Three' } });
  expect(row).not.toBeNull();
});

it('Bulk import reports errors row-by-row on malformed CSV', async () => {
  const csv = [
    'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
    ',MissingFirstName,2017-01-01,M,CM1,parent4@v2-test.tn', // row 2 invalid
    'Valid,Four,bad-date,F,CM1,parent5@v2-test.tn',          // row 3 invalid date
  ].join('\n');
  const res = await request(app.getHttpServer())
    .post('/api/students/bulk-import?dryRun=false')
    .set('Authorization', `Bearer ${adminAToken}`)
    .attach('file', Buffer.from(csv), 'students.csv')
    .expect(200);
  expect(res.body.imported).toBe(0);
  expect(res.body.errors.length).toBe(2);
  expect(res.body.errors[0].row).toBe(2);
  expect(res.body.errors[1].row).toBe(3);
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter=@ecole-saas/api test -- students.e2e-spec
git add apps/api/test/students.e2e-spec.ts
git commit -m "test(api/students): e2e bulk-import — dry-run / commit / errors row-by-row"
```

---

## Phase D — Photo upload R2 (0.3j)

### Task D1: `StudentsPhotoService`

**Files:** Create: `apps/api/src/students/students-photo.service.ts`

- [ ] **Step 1: Create file** (reuses existing `R2Service.signedPutUrl` — pattern V1.6)

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';

import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const UPLOAD_TTL_S = 300; // 5 minutes

export interface PhotoUploadResult {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

@Injectable()
export class StudentsPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  async getPhotoUploadUrl(
    studentId: string,
    contentType: string,
    currentUser: AuthenticatedUser,
  ): Promise<PhotoUploadResult> {
    if (!ALLOWED_MIMES.includes(contentType as (typeof ALLOWED_MIMES)[number])) {
      throw new BadRequestException({
        code: 'PHOTO_CONTENT_TYPE_FORBIDDEN',
        message: `contentType "${contentType}" interdit (autorisés : ${ALLOWED_MIMES.join(', ')})`,
      });
    }
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });

    const ext =
      contentType === 'image/png' ? 'png'
      : contentType === 'image/webp' ? 'webp'
      : 'jpg';
    const bucket = this.config.get<string>('r2.tenantAssetsBucket', 'ecole-saas-tenant-assets');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const key = `students/${currentUser.tenantId}/${studentId}/photo-${createId()}.${ext}`;

    const uploadUrl = await this.r2.signedPutUrl(key, contentType, UPLOAD_TTL_S, bucket);
    const finalUrl = publicUrl ? `${publicUrl}/${key}` : `r2://${bucket}/${key}`;

    return { uploadUrl, finalUrl, expiresIn: UPLOAD_TTL_S };
  }
}
```

- [ ] **Step 2: Register in `StudentsModule`**

Replace `students.module.ts` contents :

```typescript
import { Module } from '@nestjs/common';

import { R2Module } from '../common/r2/r2.module';
import { StudentsBulkImportService } from './students-bulk-import.service';
import { StudentsController } from './students.controller';
import { StudentsPhotoService } from './students-photo.service';
import { StudentsService } from './students.service';

@Module({
  imports: [R2Module],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsBulkImportService, StudentsPhotoService],
  exports: [StudentsService],
})
export class StudentsModule {}
```

(NB : if `R2Module` is not a separate module — i.e. `R2Service` is `@Global()` or registered in a `CommonModule` — drop the `imports: [R2Module]` line. Verify by `grep -nR "R2Service" apps/api/src/common/r2/`.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/students/students-photo.service.ts apps/api/src/students/students.module.ts
git commit -m "feat(api/students): StudentsPhotoService with R2 signed PUT URL"
```

---

### Task D2: Controller endpoint `POST /:id/photo-upload-url`

**Files:**
- Create: `apps/api/src/students/dto/photo-upload.dto.ts`
- Modify: `apps/api/src/students/students.controller.ts`

- [ ] **Step 1: DTO**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class PhotoUploadUrlDto {
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: 'image/jpeg' | 'image/png' | 'image/webp';
}

export class PhotoUploadResponseDto {
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() finalUrl!: string;
  @ApiProperty() expiresIn!: number;
}
```

- [ ] **Step 2: Controller — add endpoint + inject service**

Add to controller imports :

```typescript
import { PhotoUploadResponseDto, PhotoUploadUrlDto } from './dto/photo-upload.dto';
import { StudentsPhotoService } from './students-photo.service';
```

Update constructor :

```typescript
constructor(
  private readonly students: StudentsService,
  private readonly bulkImport: StudentsBulkImportService,
  private readonly photo: StudentsPhotoService,
) {}
```

Add endpoint after `@Delete(':id')` :

```typescript
@Post(':id/photo-upload-url')
@HttpCode(HttpStatus.OK)
@Roles(UserRole.SCHOOL_ADMIN)
@ApiOperation({ summary: 'Get signed R2 PUT URL for student photo (SCHOOL_ADMIN only)' })
@ApiResponse({ status: 200, type: PhotoUploadResponseDto })
async getPhotoUploadUrl(
  @CurrentUser() user: AuthenticatedUser,
  @Param('id') id: string,
  @Body() dto: PhotoUploadUrlDto,
): Promise<PhotoUploadResponseDto> {
  return this.photo.getPhotoUploadUrl(id, dto.contentType, user);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/students/dto/photo-upload.dto.ts apps/api/src/students/students.controller.ts
git commit -m "feat(api/students): POST /students/:id/photo-upload-url (R2 signed PUT)"
```

---

### Task D3: E2E test photo URL

**Files:** Modify: `apps/api/test/students.e2e-spec.ts`

- [ ] **Step 1: Append test**

```typescript
it('SCHOOL_ADMIN gets a signed photo upload URL', async () => {
  const res = await request(app.getHttpServer())
    .post(`/api/students/${s.studentsA[0]}/photo-upload-url`)
    .set('Authorization', `Bearer ${adminAToken}`)
    .send({ contentType: 'image/jpeg' })
    .expect(200);
  expect(res.body.uploadUrl).toMatch(/^https?:\/\//);
  expect(res.body.finalUrl).toContain(`students/${s.tenantA}/${s.studentsA[0]}/photo-`);
  expect(res.body.expiresIn).toBe(300);
});

it('TEACHER cannot get a photo upload URL', async () => {
  await request(app.getHttpServer())
    .post(`/api/students/${s.studentsA[0]}/photo-upload-url`)
    .set('Authorization', `Bearer ${teacherAToken}`)
    .send({ contentType: 'image/png' })
    .expect(403);
});

it('Photo upload rejects unauthorized MIME', async () => {
  await request(app.getHttpServer())
    .post(`/api/students/${s.studentsA[0]}/photo-upload-url`)
    .set('Authorization', `Bearer ${adminAToken}`)
    .send({ contentType: 'application/pdf' })
    .expect(400);
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter=@ecole-saas/api test -- students.e2e-spec
git add apps/api/test/students.e2e-spec.ts
git commit -m "test(api/students): e2e photo upload — signed URL + RBAC + MIME guard"
```

---

## Phase E — Web list page (0.7j)

### Task E1: Zod validation schemas

**Files:** Create: `apps/web/lib/validation/student.schemas.ts`

- [ ] **Step 1: Create file**

```typescript
import { z } from 'zod';

const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_LANG2 = /^[a-z]{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createStudentSchema = z.object({
  // Identité
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  dateOfBirth: z.string().regex(ISO_DATE, 'Format YYYY-MM-DD'),
  sex: z.enum(['M', 'F']),
  nationality: z.string().regex(ISO_ALPHA2, 'Code ISO 3166-1 alpha-2 (ex: TN)').optional().or(z.literal('')),

  // Scolarité
  classroom: z.string().min(1, 'Classe requise').max(50),
  enrollmentDate: z.string().regex(ISO_DATE, 'Format YYYY-MM-DD').optional().or(z.literal('')),
  previousSchooling: z.string().max(2000).optional().or(z.literal('')),

  // Famille
  parentEmail: z.string().email('Email invalide').max(254),
  siblingsCount: z.coerce.number().int().min(0).optional(),

  // Contact
  addressLine: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  country: z.string().regex(ISO_ALPHA2, 'Code ISO (ex: TN)').optional().or(z.literal('')),

  // Langue
  motherTongue: z.string().regex(ISO_LANG2, 'Code ISO 639-1 (ex: ar)').optional().or(z.literal('')),

  // Santé
  medicalNotes: z.string().max(2000).optional().or(z.literal('')),

  // Photo (set après upload R2)
  photoUrl: z.string().url().max(500).optional().or(z.literal('')),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentFormValues = z.infer<typeof createStudentSchema>;
export type UpdateStudentFormValues = z.infer<typeof updateStudentSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/validation/student.schemas.ts
git commit -m "feat(web/students): zod schemas createStudentSchema + updateStudentSchema"
```

---

### Task E2: API client

**Files:** Create: `apps/web/lib/api/students.ts`

- [ ] **Step 1: Create file** (mirrors `admin-tenants.ts` pattern)

```typescript
'use client';

import type {
  CreateStudentFormValues,
  UpdateStudentFormValues,
} from '@/lib/validation/student.schemas';

const BASE = '/api/students';

export interface StudentSummary {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  nationality: string | null;
  classroom: string;
  enrollmentDate: string;
  previousSchooling: string | null;
  parentEmail: string;
  siblingsCount: number;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  motherTongue: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStudentsResponse {
  data: StudentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BulkImportResponse {
  imported: number;
  valid: number;
  errors: { row: number; message: string }[];
  dryRun: boolean;
}

export interface PhotoUploadResponse {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

export class StudentsApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
  }
}

async function jsonRequest<T>(
  path: string,
  init: RequestInit & { auth: string },
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${init.auth}`);
  if (init.method && !['GET', 'DELETE'].includes(init.method) && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    let body: { message?: string; code?: string } = {};
    try { body = await response.json(); } catch { /* noop */ }
    throw new StudentsApiError(
      response.status,
      body.message ?? `Request failed with ${response.status}`,
      body.code,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listStudents(
  token: string,
  params: { page?: number; pageSize?: number; search?: string; classroom?: string } = {},
): Promise<ListStudentsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  if (params.classroom) qs.set('classroom', params.classroom);
  const q = qs.toString();
  return jsonRequest(`${BASE}${q ? `?${q}` : ''}`, { method: 'GET', auth: token });
}

export async function getStudent(token: string, id: string): Promise<StudentSummary> {
  return jsonRequest(`${BASE}/${id}`, { method: 'GET', auth: token });
}

export async function createStudent(
  token: string,
  values: CreateStudentFormValues,
): Promise<StudentSummary> {
  return jsonRequest(BASE, {
    method: 'POST',
    auth: token,
    body: JSON.stringify(stripEmpty(values)),
  });
}

export async function updateStudent(
  token: string,
  id: string,
  values: UpdateStudentFormValues,
): Promise<StudentSummary> {
  return jsonRequest(`${BASE}/${id}`, {
    method: 'PATCH',
    auth: token,
    body: JSON.stringify(stripEmpty(values)),
  });
}

export async function deleteStudent(token: string, id: string): Promise<void> {
  return jsonRequest(`${BASE}/${id}`, { method: 'DELETE', auth: token });
}

export async function bulkImportStudents(
  token: string,
  file: File,
  dryRun: boolean,
): Promise<BulkImportResponse> {
  const fd = new FormData();
  fd.append('file', file);
  return jsonRequest(`${BASE}/bulk-import?dryRun=${dryRun ? 'true' : 'false'}`, {
    method: 'POST',
    auth: token,
    body: fd,
  });
}

export async function getPhotoUploadUrl(
  token: string,
  id: string,
  contentType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<PhotoUploadResponse> {
  return jsonRequest(`${BASE}/${id}/photo-upload-url`, {
    method: 'POST',
    auth: token,
    body: JSON.stringify({ contentType }),
  });
}

function stripEmpty(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === '' || v === undefined) continue;
    out[k] = v;
  }
  return out;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/api/students.ts
git commit -m "feat(web/students): API client (CRUD + bulk-import + photo)"
```

---

### Task E3: `/students` list page

**Files:**
- Create: `apps/web/app/(app)/students/page.tsx`
- Create: `apps/web/app/(app)/students/students-list.tsx`

- [ ] **Step 1: Server page**

```tsx
import { StudentsList } from './students-list';

export const dynamic = 'force-dynamic';

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Élèves</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des élèves de l&apos;établissement.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/students/bulk-import"
            className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            Import CSV
          </a>
          <a
            href="/students/new"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nouvel élève
          </a>
        </div>
      </header>
      <StudentsList />
    </div>
  );
}
```

- [ ] **Step 2: Client list**

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { listStudents, type StudentSummary } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const PAGE_SIZE = 25;

function initials(s: StudentSummary): string {
  return `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
}

function avatarColor(id: string): string {
  // Stable color per id : hash → hue
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 75%)`;
}

export function StudentsList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role === 'SCHOOL_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce 300ms
  useState(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['students', page, debounced],
    queryFn: () => listStudents(accessToken!, { page, pageSize: PAGE_SIZE, search: debounced || undefined }),
    enabled: !!accessToken,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-rose-600">Erreur : {(error as Error).message}</p>;
  if (!data || data.total === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucun élève pour l&apos;instant.</p>
        {canWrite && (
          <Link href="/students/new" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Créer le premier élève →
          </Link>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou prénom…"
        className="h-10 w-full max-w-md rounded-md border px-3 text-sm"
        aria-label="Rechercher un élève"
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classe</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date naissance</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-gray-800"
                      style={{ backgroundColor: avatarColor(s.id) }}
                    >
                      {initials(s)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{s.lastName} {s.firstName}</td>
                <td className="px-4 py-3 text-sm">{s.classroom}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{s.parentEmail}</td>
                <td className="px-4 py-3 text-sm">{s.dateOfBirth}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/students/${s.id}`} className="text-sm font-medium text-primary hover:underline">
                    Voir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground">{data.total} élèves · page {page}/{totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-md border px-3 disabled:opacity-50"
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-md border px-3 disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add "apps/web/app/(app)/students/page.tsx" "apps/web/app/(app)/students/students-list.tsx"
git commit -m "feat(web/students): /students list page with search + pagination"
```

---

### Task E4: Header link "Élèves"

**Files:** Modify: `apps/web/app/(app)/app-shell-client.tsx`

- [ ] **Step 1: Add link visible for all non-SUPER_ADMIN authenticated users**

Locate the header navigation block. Add (before the existing `canEditBranding` block) :

```tsx
{user && user.role !== 'SUPER_ADMIN' && (
  <Link
    href={'/students' as Route}
    className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
  >
    Élèves
  </Link>
)}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add "apps/web/app/(app)/app-shell-client.tsx"
git commit -m "feat(web/students): Élèves link in header (non-SUPER_ADMIN)"
```

---

## Phase F — Web create form (1j)

### Task F1: `<PhotoUpload>` widget

**Files:** Create: `apps/web/app/(app)/students/components/photo-upload.tsx`

- [ ] **Step 1: Create component**

```tsx
'use client';

import { useState } from 'react';

import { getPhotoUploadUrl } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

interface Props {
  studentId?: string; // undefined avant création — preview only
  initialUrl?: string | null;
  initials: string;
  onUploaded: (publicUrl: string) => void;
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED)[number];

export function PhotoUpload({ studentId, initialUrl, initials, onUploaded }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    if (!ALLOWED.includes(file.type as AllowedMime)) {
      setError('Format autorisé : JPEG, PNG, WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Taille max : 5 Mo');
      return;
    }

    // Preview local immédiat
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    if (!studentId) {
      // Création : upload différé jusqu'à création du student (form holds file blob)
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, finalUrl } = await getPhotoUploadUrl(
        accessToken,
        studentId,
        file.type as AllowedMime,
      );
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`R2 upload failed (${putRes.status})`);
      onUploaded(finalUrl);
    } catch (err) {
      setError((err as Error).message);
      setPreview(initialUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-semibold"
        >
          {initials || '?'}
        </div>
      )}
      <div className="space-y-1">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={uploading}
          aria-label="Photo de l'élève"
          className="block text-sm"
        />
        <p className="text-xs text-muted-foreground">
          JPEG / PNG / WebP — max 5 Mo
        </p>
        {uploading && <p className="text-xs text-muted-foreground">Upload en cours…</p>}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/app/(app)/students/components/photo-upload.tsx"
git commit -m "feat(web/students): <PhotoUpload> widget with R2 signed PUT + initiales fallback"
```

---

### Task F2: `/students/new` form sectionné

**Files:**
- Create: `apps/web/app/(app)/students/new/page.tsx`
- Create: `apps/web/app/(app)/students/new/create-student-form.tsx`

- [ ] **Step 1: Server page**

```tsx
import { CreateStudentForm } from './create-student-form';

export const dynamic = 'force-dynamic';

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Nouvel élève</h1>
        <p className="text-sm text-muted-foreground">
          Création d&apos;une fiche élève complète.
        </p>
      </header>
      <CreateStudentForm />
    </div>
  );
}
```

- [ ] **Step 2: Client form (sectionné)**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { PhotoUpload } from '../components/photo-upload';
import {
  StudentsApiError,
  createStudent,
  type StudentSummary,
} from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import {
  createStudentSchema,
  type CreateStudentFormValues,
} from '@/lib/validation/student.schemas';

const COUNTRIES = ['TN', 'FR', 'DZ', 'MA', 'EG', 'SA', 'AE', 'BE', 'CH', 'CA'];
const LANGUAGES = ['ar', 'fr', 'en', 'es', 'de', 'it'];

export function CreateStudentForm() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [created, setCreated] = useState<StudentSummary | null>(null);

  const form = useForm<CreateStudentFormValues>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      country: 'TN',
      motherTongue: 'ar',
      siblingsCount: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateStudentFormValues) => createStudent(accessToken!, values),
    onSuccess: (data) => setCreated(data),
  });

  if (created) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">Élève créé</h2>
        <p className="mt-1 text-sm text-emerald-800">
          {created.firstName} {created.lastName} a été ajouté à la classe {created.classroom}.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/students/${created.id}`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Voir la fiche
          </Link>
          <button
            type="button"
            onClick={() => { setCreated(null); form.reset(); }}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
          >
            Créer un autre élève
          </button>
          <Link href="/students" className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  const fieldError = (name: keyof CreateStudentFormValues) =>
    form.formState.errors[name]?.message?.toString();

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Section 1 — Identité */}
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Identité</h2>

        <PhotoUpload
          initials="?"
          onUploaded={(url) => form.setValue('photoUrl', url)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="firstName">Prénom *</label>
            <input id="firstName" {...form.register('firstName')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
            {fieldError('firstName') && <p className="mt-1 text-xs text-rose-600">{fieldError('firstName')}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="lastName">Nom *</label>
            <input id="lastName" {...form.register('lastName')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
            {fieldError('lastName') && <p className="mt-1 text-xs text-rose-600">{fieldError('lastName')}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="dateOfBirth">Date de naissance *</label>
            <input id="dateOfBirth" type="date" {...form.register('dateOfBirth')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
            {fieldError('dateOfBirth') && <p className="mt-1 text-xs text-rose-600">{fieldError('dateOfBirth')}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="sex">Sexe *</label>
            <select id="sex" {...form.register('sex')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">—</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
            {fieldError('sex') && <p className="mt-1 text-xs text-rose-600">{fieldError('sex')}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="nationality">Nationalité</label>
            <select id="nationality" {...form.register('nationality')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              <option value="">—</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="motherTongue">Langue maternelle</label>
            <select id="motherTongue" {...form.register('motherTongue')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Section 2 — Scolarité */}
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Scolarité</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="classroom">Classe *</label>
            <input id="classroom" {...form.register('classroom')} placeholder="ex: CP-A" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
            {fieldError('classroom') && <p className="mt-1 text-xs text-rose-600">{fieldError('classroom')}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="enrollmentDate">Date inscription</label>
            <input id="enrollmentDate" type="date" {...form.register('enrollmentDate')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="previousSchooling">Antécédents scolaires</label>
          <textarea id="previousSchooling" {...form.register('previousSchooling')} rows={3} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
      </section>

      {/* Section 3 — Famille + Contact */}
      <section className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Famille & Contact</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium" htmlFor="parentEmail">Email parent *</label>
            <input id="parentEmail" type="email" {...form.register('parentEmail')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
            {fieldError('parentEmail') && <p className="mt-1 text-xs text-rose-600">{fieldError('parentEmail')}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="siblingsCount">Nombre de frères/sœurs</label>
            <input id="siblingsCount" type="number" min={0} {...form.register('siblingsCount')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium" htmlFor="addressLine">Adresse</label>
            <input id="addressLine" {...form.register('addressLine')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="city">Ville</label>
            <input id="city" {...form.register('city')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="postalCode">Code postal</label>
            <input id="postalCode" {...form.register('postalCode')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="country">Pays</label>
            <select id="country" {...form.register('country')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm">
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Section 4 — Santé (PHI light) */}
      <section className="space-y-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl leading-none">⚠️</span>
          <div>
            <h2 className="text-lg font-semibold text-amber-900">Santé — données sensibles RGPD</h2>
            <p className="text-sm text-amber-800">
              Allergies, traitements légers, contacts d&apos;urgence. Accès tracé (audit log).
              Pour le médical strict (PHI), attendre le module Santé V8.
            </p>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="medicalNotes">Notes médicales (free text)</label>
          <textarea id="medicalNotes" {...form.register('medicalNotes')} rows={4} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
        </div>
      </section>

      {mutation.error && (
        <p className="text-sm text-rose-600">
          Erreur : {(mutation.error as StudentsApiError).message}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/students')}
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? 'Création…' : 'Créer l\'élève'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add "apps/web/app/(app)/students/new/"
git commit -m "feat(web/students): /students/new sectionné form (Identité/Scolarité/Famille/Santé)"
```

---

## Phase G — Web detail + edit + bulk import UI (0.7j)

### Task G1: `/students/[id]` detail page

**Files:**
- Create: `apps/web/app/(app)/students/[id]/page.tsx`
- Create: `apps/web/app/(app)/students/[id]/student-detail.tsx`

- [ ] **Step 1: Server page**

```tsx
import { StudentDetail } from './student-detail';

export const dynamic = 'force-dynamic';

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return <StudentDetail id={params.id} />;
}
```

- [ ] **Step 2: Client detail with inline edit + delete**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  deleteStudent,
  getStudent,
  updateStudent,
  type StudentSummary,
} from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import {
  updateStudentSchema,
  type UpdateStudentFormValues,
} from '@/lib/validation/student.schemas';

interface Props { id: string }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export function StudentDetail({ id }: Props) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role === 'SCHOOL_ADMIN';
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(accessToken!, id),
    enabled: !!accessToken,
  });

  const form = useForm<UpdateStudentFormValues>({ resolver: zodResolver(updateStudentSchema) });

  const updateMut = useMutation({
    mutationFn: (values: UpdateStudentFormValues) => updateStudent(accessToken!, id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setEditing(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteStudent(accessToken!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      router.push('/students');
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-rose-600">Erreur : {(error as Error).message}</p>;
  if (!student) return <p className="text-sm text-muted-foreground">Élève introuvable.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/students" className="text-sm text-muted-foreground hover:underline">← Élèves</Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-muted-foreground">Classe {student.classroom}</p>
        </div>
        {canWrite && !editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { form.reset(asFormValues(student)); setEditing(true); }}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-9 items-center rounded-md border border-rose-300 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Supprimer
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <EditPanel form={form} student={student} onCancel={() => setEditing(false)} onSubmit={(v) => updateMut.mutate(v)} pending={updateMut.isPending} />
      ) : (
        <ReadOnlyPanel student={student} />
      )}

      {confirmDelete && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Confirmer la suppression</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {student.firstName} {student.lastName} sera marqué comme supprimé. Les historiques (notes, paiements) seront préservés.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 rounded-md border px-3 text-sm">Annuler</button>
              <button
                type="button"
                onClick={() => deleteMut.mutate()}
                disabled={deleteMut.isPending}
                className="h-9 rounded-md bg-rose-600 px-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function asFormValues(s: StudentSummary): UpdateStudentFormValues {
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    dateOfBirth: s.dateOfBirth,
    sex: s.sex,
    nationality: s.nationality ?? '',
    classroom: s.classroom,
    enrollmentDate: s.enrollmentDate,
    previousSchooling: s.previousSchooling ?? '',
    parentEmail: s.parentEmail,
    siblingsCount: s.siblingsCount,
    addressLine: s.addressLine ?? '',
    city: s.city ?? '',
    postalCode: s.postalCode ?? '',
    country: s.country ?? '',
    motherTongue: s.motherTongue ?? '',
    medicalNotes: s.medicalNotes ?? '',
    photoUrl: s.photoUrl ?? '',
  };
}

function ReadOnlyPanel({ student }: { student: StudentSummary }) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Identité</h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Date naissance" value={student.dateOfBirth} />
          <Field label="Sexe" value={student.sex === 'M' ? 'Masculin' : 'Féminin'} />
          <Field label="Nationalité" value={student.nationality} />
          <Field label="Langue maternelle" value={student.motherTongue} />
        </dl>
      </section>
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Scolarité</h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Classe" value={student.classroom} />
          <Field label="Inscription" value={student.enrollmentDate} />
          <Field label="Antécédents" value={student.previousSchooling} />
        </dl>
      </section>
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Famille & Contact</h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Parent" value={student.parentEmail} />
          <Field label="Frères/sœurs" value={student.siblingsCount} />
          <Field label="Adresse" value={student.addressLine} />
          <Field label="Ville" value={student.city} />
          <Field label="Code postal" value={student.postalCode} />
          <Field label="Pays" value={student.country} />
        </dl>
      </section>
      {student.medicalNotes && (
        <section className="rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-amber-900">⚠️ Notes médicales (RGPD)</h2>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{student.medicalNotes}</p>
        </section>
      )}
    </div>
  );
}

function EditPanel(props: {
  form: ReturnType<typeof useForm<UpdateStudentFormValues>>;
  student: StudentSummary;
  onCancel: () => void;
  onSubmit: (v: UpdateStudentFormValues) => void;
  pending: boolean;
}) {
  const { form, onCancel, onSubmit, pending } = props;
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border bg-card p-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Prénom</span>
          <input {...form.register('firstName')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Nom</span>
          <input {...form.register('lastName')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Classe</span>
          <input {...form.register('classroom')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email parent</span>
          <input type="email" {...form.register('parentEmail')} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Champs étendus modifiables via le formulaire complet — édition rapide pour les champs courants.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-9 rounded-md border px-3 text-sm">Annuler</button>
        <button type="submit" disabled={pending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add "apps/web/app/(app)/students/[id]/"
git commit -m "feat(web/students): /students/[id] detail + inline edit + delete confirm"
```

---

### Task G2: `/students/bulk-import` UI

**Files:**
- Create: `apps/web/app/(app)/students/bulk-import/page.tsx`
- Create: `apps/web/app/(app)/students/bulk-import/bulk-import-form.tsx`

- [ ] **Step 1: Server page**

```tsx
import { BulkImportForm } from './bulk-import-form';

export const dynamic = 'force-dynamic';

export default function BulkImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Import élèves (CSV)</h1>
        <p className="text-sm text-muted-foreground">
          Importez jusqu&apos;à 1000 élèves en un fichier. Format requis : header en première ligne.
        </p>
      </header>
      <BulkImportForm />
    </div>
  );
}
```

- [ ] **Step 2: Client form**

```tsx
'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { bulkImportStudents, type BulkImportResponse } from '@/lib/api/students';
import { useAuthStore } from '@/lib/auth/use-auth-store';

const CSV_TEMPLATE = 'firstName,lastName,dateOfBirth,sex,classroom,parentEmail,nationality,city,country,motherTongue,siblingsCount';

export function BulkImportForm() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<BulkImportResponse | null>(null);

  const mut = useMutation({
    mutationFn: ({ f, dryRun }: { f: File; dryRun: boolean }) =>
      bulkImportStudents(accessToken!, f, dryRun),
    onSuccess: (res) => setReport(res),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setReport(null);
    const f = e.target.files?.[0];
    setFile(f ?? null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">1. Charger le CSV</h2>
        <p className="mt-1 text-xs text-muted-foreground">Format header :</p>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-xs">{CSV_TEMPLATE}</pre>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="mt-3 block text-sm"
          aria-label="Fichier CSV"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={!file || mut.isPending}
            onClick={() => file && mut.mutate({ f: file, dryRun: true })}
            className="h-10 rounded-md border px-4 text-sm font-medium disabled:opacity-50"
          >
            {mut.isPending ? 'Analyse…' : 'Tester (dry-run)'}
          </button>
          <button
            type="button"
            disabled={!file || mut.isPending || (report?.errors.length ?? 0) > 0}
            onClick={() => file && mut.mutate({ f: file, dryRun: false })}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {mut.isPending ? 'Import…' : 'Importer'}
          </button>
        </div>
        {mut.error && <p className="mt-3 text-sm text-rose-600">Erreur : {(mut.error as Error).message}</p>}
      </section>

      {report && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">2. Résultat</h2>
          <dl className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Valides</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-emerald-700">{report.valid}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Erreurs</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-rose-700">{report.errors.length}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Importés</dt>
              <dd className="mt-0.5 text-2xl font-semibold">{report.imported}</dd>
            </div>
          </dl>

          {report.errors.length > 0 && (
            <div className="mt-4 max-h-80 overflow-y-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Ligne</th>
                    <th className="px-3 py-2 text-left">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono">{e.row}</td>
                      <td className="px-3 py-2 text-rose-700">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {report.imported > 0 && (
            <div className="mt-4 rounded bg-emerald-50 p-4">
              <p className="text-sm text-emerald-900">
                ✅ {report.imported} élèves importés avec succès.
              </p>
              <Link
                href="/students"
                className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline"
              >
                Voir la liste →
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/web type-check
git add "apps/web/app/(app)/students/bulk-import/"
git commit -m "feat(web/students): /students/bulk-import UI (dry-run + commit)"
```

---

## Phase H — Mobile read-only (0.5j)

### Task H1: Mobile API client

**Files:** Create: `apps/mobile/lib/api/students.ts`

- [ ] **Step 1: Create file** (mirror web client minus mutations)

```typescript
import { useAuthStore } from '@/lib/auth/use-auth-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: 'M' | 'F';
  nationality: string | null;
  classroom: string;
  enrollmentDate: string;
  previousSchooling: string | null;
  parentEmail: string;
  siblingsCount: number;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  motherTongue: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
}

export interface ListStudentsResponse {
  data: StudentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

async function authed<T>(path: string): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let body: { message?: string } = {};
    try { body = await res.json(); } catch {}
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function listStudents(params: { page?: number; pageSize?: number; search?: string } = {}): Promise<ListStudentsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.search) qs.set('search', params.search);
  const q = qs.toString();
  return authed(`/api/students${q ? `?${q}` : ''}`);
}

export function getStudent(id: string): Promise<StudentSummary> {
  return authed(`/api/students/${id}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/api/students.ts
git commit -m "feat(mobile/students): read-only API client (list + getById)"
```

---

### Task H2: Liste FlatList

**Files:** Create: `apps/mobile/app/(app)/students/index.tsx`

- [ ] **Step 1: Create file**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native';

import { listStudents, type StudentSummary } from '@/lib/api/students';

function Initials({ s }: { s: StudentSummary }) {
  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-200">
      <Text className="text-xs font-semibold text-gray-700">
        {(s.firstName[0] ?? '') + (s.lastName[0] ?? '')}
      </Text>
    </View>
  );
}

export default function StudentsListScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['students', search],
    queryFn: () => listStudents({ pageSize: 50, search: search || undefined }),
  });

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 p-4">
        <Text className="text-2xl font-bold">Élèves</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher…"
          className="mt-2 h-10 rounded-md border border-gray-300 px-3"
          accessibilityLabel="Rechercher un élève"
        />
      </View>

      {isLoading ? (
        <Text className="p-4 text-gray-500">Chargement…</Text>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(s) => s.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ItemSeparatorComponent={() => <View className="h-px bg-gray-100" />}
          ListEmptyComponent={<Text className="p-4 text-gray-500">Aucun élève.</Text>}
          renderItem={({ item }) => (
            <Link href={`/students/${item.id}`} asChild>
              <View className="flex-row items-center gap-3 p-4">
                <Initials s={item} />
                <View className="flex-1">
                  <Text className="text-base font-medium">{item.lastName} {item.firstName}</Text>
                  <Text className="text-sm text-gray-500">{item.classroom} · {item.parentEmail}</Text>
                </View>
              </View>
            </Link>
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/mobile/app/(app)/students/index.tsx"
git commit -m "feat(mobile/students): list screen with FlatList + pull-to-refresh + search"
```

---

### Task H3: Détail read-only

**Files:** Create: `apps/mobile/app/(app)/students/[id].tsx`

- [ ] **Step 1: Create file**

```tsx
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { getStudent } from '@/lib/api/students';

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <View className="mb-2">
      <Text className="text-xs uppercase tracking-wide text-gray-500">{label}</Text>
      <Text className="text-base text-gray-900">{value ?? '—'}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
      <Text className="mb-3 text-lg font-semibold">{title}</Text>
      {children}
    </View>
  );
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id!),
    enabled: !!id,
  });

  if (isLoading) return <Text className="p-4 text-gray-500">Chargement…</Text>;
  if (error) return <Text className="p-4 text-rose-600">Erreur : {(error as Error).message}</Text>;
  if (!s) return <Text className="p-4 text-gray-500">Introuvable.</Text>;

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="mb-4">
        <Text className="text-2xl font-bold">{s.firstName} {s.lastName}</Text>
        <Text className="text-sm text-gray-500">Classe {s.classroom}</Text>
      </View>

      <Section title="Identité">
        <Field label="Date naissance" value={s.dateOfBirth} />
        <Field label="Sexe" value={s.sex === 'M' ? 'Masculin' : 'Féminin'} />
        <Field label="Nationalité" value={s.nationality} />
        <Field label="Langue maternelle" value={s.motherTongue} />
      </Section>

      <Section title="Scolarité">
        <Field label="Classe" value={s.classroom} />
        <Field label="Inscription" value={s.enrollmentDate} />
        <Field label="Antécédents" value={s.previousSchooling} />
      </Section>

      <Section title="Famille & Contact">
        <Field label="Parent" value={s.parentEmail} />
        <Field label="Frères/sœurs" value={s.siblingsCount} />
        <Field label="Adresse" value={s.addressLine} />
        <Field label="Ville" value={s.city} />
        <Field label="Pays" value={s.country} />
      </Section>

      {s.medicalNotes ? (
        <View className="mb-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <Text className="mb-2 text-lg font-semibold text-amber-900">⚠️ Notes médicales</Text>
          <Text className="text-sm text-amber-900">{s.medicalNotes}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/mobile/app/(app)/students/[id].tsx"
git commit -m "feat(mobile/students): detail screen (read-only, sectionné)"
```

---

### Task H4: Dashboard tile "Élèves"

**Files:** Modify: `apps/mobile/app/(app)/dashboard.tsx`

- [ ] **Step 1: Locate the dashboard tiles grid + add a `Link`-wrapped pressable**

Inside the tiles grid (existing pattern, e.g. tile component or `View` row), add :

```tsx
import { Link } from 'expo-router';

// …inside JSX (next to existing dashboard tiles)…
<Link href="/students" asChild>
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Aller aux élèves"
    className="m-2 flex-1 rounded-lg border border-gray-200 bg-white p-4"
  >
    <Text className="text-3xl">👨‍🎓</Text>
    <Text className="mt-2 text-base font-semibold">Élèves</Text>
    <Text className="text-xs text-gray-500">Liste + fiches</Text>
  </Pressable>
</Link>
```

(Add `Pressable` to `react-native` imports if absent.)

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter=@ecole-saas/mobile type-check
git add "apps/mobile/app/(app)/dashboard.tsx"
git commit -m "feat(mobile/students): Élèves tile on dashboard"
```

---

## Phase I — Isolation + ADR + roadmap + PR (0.3j)

### Task I1: Extend multi-tenant isolation e2e

**Files:** Modify: `apps/api/test/multi-tenant-isolation.e2e-spec.ts`

- [ ] **Step 1: Append a `describe('Student isolation R10')` block**

After existing isolation tests, append :

```typescript
describe('Student isolation R10', () => {
  it('SCHOOL_ADMIN tenant A cannot READ a tenant B student', async () => {
    // Assuming seed has tenantA + tenantB + adminAToken + studentInTenantB
    await request(app.getHttpServer())
      .get(`/api/students/${studentInTenantB.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(404);
  });

  it('SCHOOL_ADMIN tenant A cannot UPDATE a tenant B student', async () => {
    await request(app.getHttpServer())
      .patch(`/api/students/${studentInTenantB.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ classroom: 'HACK' })
      .expect(404);
  });

  it('SCHOOL_ADMIN tenant A cannot DELETE a tenant B student', async () => {
    await request(app.getHttpServer())
      .delete(`/api/students/${studentInTenantB.id}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .expect(404);
  });

  it('Bulk import in tenant A does not bleed into tenant B', async () => {
    const csv = [
      'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
      'Isolation,Test,2017-01-01,M,CM1,parent-iso@v2-test.tn',
    ].join('\n');
    await request(app.getHttpServer())
      .post('/api/students/bulk-import?dryRun=false')
      .set('Authorization', `Bearer ${adminAToken}`)
      .attach('file', Buffer.from(csv), 'students.csv')
      .expect(200);
    const rowsInB = await prisma.student.count({
      where: { tenantId: tenantB.id, lastName: 'Test' },
    });
    expect(rowsInB).toBe(0);
  });
});
```

(Adapt fixture names to whatever the existing `multi-tenant-isolation.e2e-spec.ts` uses.)

- [ ] **Step 2: Run + commit**

```bash
pnpm --filter=@ecole-saas/api test -- multi-tenant-isolation.e2e-spec
git add apps/api/test/multi-tenant-isolation.e2e-spec.ts
git commit -m "test(api/isolation): R10 — Student CRUD + bulk-import cross-tenant"
```

---

### Task I2: ADR `0006-students-module.md`

**Files:** Create: `docs/adr/0006-students-module.md`

- [ ] **Step 1: Create file**

```markdown
# ADR 0006 — Module Élèves (V2)

**Date** : 2026-05-25
**Statut** : Accepté
**Auteurs** : équipe Klasso

## Contexte

V1.8 a livré la capacité super-admin de provisionner un tenant + admin invite end-to-end. V2 inaugure les modules métier en commençant par l'**entité racine** : l'élève. Toutes les vagues V3-V8 (Parents, Enseignants, Évaluations, Facturation, Cantine/Transport, Santé) dépendent du modèle `Student`.

## Décisions

### D1 — Profondeur des champs : "Complet" (~15 champs)

Choix entre "Minimal" (6 champs) et "Complet" (15 champs incluant nationalité, langue, médical light, photo, adresse). User a tranché "Complet" → +1j effort vs Minimal.

Justification : éviter le remaniement de schema dans 1 mois quand le besoin parents/enseignants pour avoir les contacts urgents apparaîtra.

### D2 — Plateformes : Web full CRUD + Mobile read-only

Web : pages liste/création/édition/détail/bulk-import. Mobile : liste + détail read-only seulement. Write mobile reportée V3 (corollaire du module Parents).

Justification : éviter de construire 2 formulaires complexes en parallèle avant que la relation `Parent ↔ Student` (V3) ne soit fixée.

### D3 — RBAC : "Standard métier" (5 rôles × 7 actions)

- `SCHOOL_ADMIN` : full CRUD
- `TEACHER` : read all (tenant)
- `PARENT` : read own children only (scoped par `parentEmail`)
- `STAFF` : read all
- `SUPER_ADMIN` : pas de cross-tenant ici (use `/admin`)

Implémentation : `@Roles()` decorator + service-side scoping pour `PARENT`. JAMAIS de scoping client-side.

### D4 — Bulk CSV import

Endpoint `POST /students/bulk-import` avec `dryRun` mode (preview erreurs sans insertion). Critique pour onboarding des écoles avec >50 élèves existants. Limite 1000 lignes / 5MB.

## Alternatives rejetées

- **Entité `Class` relationnelle dès V2** : rejeté → `classroom: string` libre, V4 introduira `Class` quand le module Enseignants & Emplois du temps arrivera. Migration data V4 mappera les strings vers les nouvelles entités.

- **Relation `Parent` N-N avec `Student` dès V2** : rejeté → `parentEmail: string` est une simple référence textuelle. V3 introduira la table `Parent` + table de jointure `ParentStudent`. Script migration `migrate-parent-emails-to-relations.ts` matchera les `student.parentEmail` aux nouveaux `User(role=PARENT)`.

- **Médical strict / PHI fort dès V2** : rejeté → `medicalNotes` est un free text optionnel avec warning RGPD UI. V8 (Module Santé) introduira allergies structurées, traitements, urgences avec PHI fort + chiffrement at-rest.

## Conséquences

### Positives
- Onboarding écoles : CSV bulk = 100 élèves en 1 clic.
- Réutilisation totale du pattern R2 V1.6 pour photo (zéro nouveau service infra).
- Test d'isolation R10 étendu → confiance multi-tenant.

### Négatives / migration future
- **`parentEmail: string`** : à migrer V3 quand `Parent` devient une entité.
- **`classroom: string`** : à migrer V4 quand `Class` devient relationnel.
- **`medicalNotes` PHI light** : à reclassifier V8 avec champs structurés + chiffrement.

## Références
- Spec : `docs/superpowers/specs/2026-05-25-v2-eleves-module-design.md`
- Plan : `docs/superpowers/plans/2026-05-25-v2-eleves-module.md`
- Pattern R2 réutilisé : `apps/api/src/tenant-brand/tenant-brand.service.ts:122` (V1.6)
- Isolation infra : `apps/api/src/common/prisma/tenant.extension.ts` (V1 D phase)
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0006-students-module.md
git commit -m "docs(adr): 0006 — Students module (4 décisions + alternatives)"
```

---

### Task I3: Roadmap update + D24 lock

**Files:** Modify: `docs/roadmap.md`

- [ ] **Step 1: Update V2 row** — replace existing V2 line with :

```markdown
| **2** | Module Élèves — Web full CRUD + Mobile read-only + Bulk CSV import + RBAC 5 rôles + Photo R2 | ~6j | 🟢 V2 livré (2026-05-25) |
```

- [ ] **Step 2: Append D24 entry below the D23 lock block**

```markdown
### D24 — V2 Module Élèves (2026-05-25)

**Décision utilisateur** : V2 = Module Élèves. Scope étendu vs roadmap initial :
- Champs **Complet** (~15 champs : identité + scolarité + famille + adresse + langue + médical light + photo)
- **Web full CRUD + Mobile read-only** (mobile write reportée V3 avec Parents)
- **RBAC standard métier** : SCHOOL_ADMIN write / TEACHER+STAFF read all / PARENT read own children / SUPER_ADMIN via /admin
- **+ Bulk CSV import** (POST + UI dry-run + error report row-by-row)
- **Photo upload R2** réutilise pattern V1.6 tenant-brand

**Effort réel** : ~6j (vs 3j initial roadmap).

**Hors-scope explicite** : entité `Class` relationnelle (→ V4), relation `Parent` N-N (→ V3), médical strict PHI (→ V8), CSV templates UI téléchargeables (→ V11), recherche full-text (→ V11), mobile write CRUD (→ V3), export PDF (→ V11).
```

- [ ] **Step 3: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs(roadmap): V2 Module Élèves livré + D24 lock entry"
```

---

### Task I4: Final verification + push + PR

- [ ] **Step 1: Full verification suite**

```bash
pnpm install
pnpm --filter=@ecole-saas/api prisma generate
pnpm lint
pnpm type-check
pnpm build
pnpm test
```

Expected: all green. Fix any drift before pushing.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/v2-eleves
```

- [ ] **Step 3: Open PR (do NOT auto-merge — CLAUDE.md politique auto-merge sur CI verte applique à la PR via GitHub Actions)**

```bash
gh pr create --base main --head feat/v2-eleves \
  --title "feat(v2): Module Élèves — Web full CRUD + Mobile read-only + Bulk CSV + RBAC" \
  --body "$(cat <<'EOF'
## Summary

V2 = première vague métier. Livre le CRUD Élèves complet :
- Backend : 7 endpoints (CRUD + bulk-import + photo-upload-url) + RBAC 5 rôles × 7 actions + isolation multi-tenant (R10)
- Prisma : modèle `Student` 15 champs + `Sex` enum + 3 index composites + soft-delete
- Web : 4 pages (liste, création sectionnée 4 sections, détail + edit + delete, bulk import CSV)
- Mobile : 2 écrans read-only (liste + détail sectionné)
- Tests : 9 unit + 16 e2e (CRUD + RBAC matrix + bulk-import + photo + isolation cross-tenant)

## Phases livrées (A-I)

- [x] A — Prisma migration `v2_student` + extend `TENANT_SCOPED_MODELS`
- [x] B — Backend `StudentsService` + Controller + DTOs + TDD specs
- [x] C — Bulk CSV import (csv-parse + zod + dry-run + tx)
- [x] D — Photo R2 signed PUT URL (réutilise V1.6 `R2Service`)
- [x] E — Web list page + Header link "Élèves"
- [x] F — Web `<PhotoUpload>` widget + create form sectionné 4 sections
- [x] G — Web detail + inline edit + delete + bulk-import UI
- [x] H — Mobile read-only list + detail + dashboard tile
- [x] I — Isolation R10 extended + ADR 0006 + roadmap D24

## RBAC matrix (spec §3.5)

| Action | SCHOOL_ADMIN | TEACHER | PARENT | STAFF | SUPER_ADMIN |
|--------|--------------|---------|--------|-------|-------------|
| Create | ✅ | 403 | 403 | 403 | use /admin |
| List   | all | all | scoped by parentEmail | all | n/a |
| Read   | ✅ | ✅ | own children only | ✅ | n/a |
| Update | ✅ | 403 | 403 | 403 | n/a |
| Delete (soft) | ✅ | 403 | 403 | 403 | n/a |
| Bulk import | ✅ | 403 | 403 | 403 | n/a |
| Photo upload | ✅ | 403 | 403 | 403 | n/a |

## Test plan

- [ ] CI lint + type-check + build verts
- [ ] CI unit tests verts (9 service tests)
- [ ] CI e2e tests verts (~16 tests : CRUD + RBAC + bulk + photo + isolation)
- [ ] Vercel preview deploy : login SCHOOL_ADMIN → /students → créer élève → photo upload → bulk import dry-run + commit
- [ ] Vercel preview deploy : login PARENT → /students → voit uniquement ses enfants
- [ ] Vercel preview deploy : login TEACHER → /students → voit tous, pas de bouton create/edit/delete
- [ ] Mobile Expo dev build : login → tile Élèves → liste → détail

## Hors-scope explicite (cf. spec §1.3 + ADR 0006)

- Entité `Class` relationnelle → V4
- Relation `Parent` N-N → V3
- Médical strict PHI → V8
- Mobile write CRUD → V3
EOF
)"
```

- [ ] **Step 4: Watch CI → auto-merge per CLAUDE.md règle 9**

```bash
gh pr checks --watch
```

Once green :

```bash
gh pr merge --merge
```

- [ ] **Step 5: Final commit (plan execution closure)**

The plan execution is complete. STOP — V3 scope requires explicit user validation (cf. CLAUDE.md règle 10).

---

## Self-Review (à la fin)

Spec coverage check (pointe la tâche pour chaque exigence de la spec) :

| Spec requirement (§) | Implementation task |
|----------------------|---------------------|
| §3.1 Prisma `Student` model + `Sex` enum + 3 index | A1 |
| §3.1 `TENANT_SCOPED_MODELS += 'Student'` | A3 |
| §3.2 7 endpoints REST | B3 (5) + C3 (bulk) + D2 (photo) |
| §3.2 `dryRun` query param | C2, C3 |
| §3.2 search ILIKE + pagination | B2, E3 |
| §3.5 RBAC matrix 5 rôles × 7 actions | B3 `@Roles()` + B2 service scoping (PARENT) |
| §3.5 Audit `student.created/updated/deleted/bulk_imported` | B2, C2 |
| §3.3 Web 4 pages sectionnées | E3, F2, G1, G2 |
| §3.3 PhotoUploadWidget + RGPD warning | F1, F2 (section 4) |
| §3.4 Mobile read-only list + detail | H2, H3 |
| §3.6 CSV flow dry-run → preview → commit | C2, G2 |
| §3.7 R2 signed PUT URL | D1, F1 |
| §5.1 Isolation R10 cross-tenant | B6, I1 |
| §5.4 ADR 0006 + roadmap D24 | I2, I3 |

Placeholder scan : aucune occurrence de `TBD`, `TODO`, `<fill in>` dans le plan — vérifié.

Type consistency check :
- `CreateStudentDto` (API) ↔ `createStudentSchema` (web Zod) : tous les 15 champs alignés
- `StudentResponseDto` (API) ↔ `StudentSummary` (web) ↔ `StudentSummary` (mobile) : alignés
- `Sex` enum : Prisma → DTO → Zod → form (`'M' | 'F'`)
- `BulkImportResult` (service) ↔ `BulkImportResponseDto` (controller) ↔ `BulkImportResponse` (web client) : alignés

Sex enum cohérence : `Sex.M | Sex.F` partout (Prisma client + DTO + Zod literal + form select option).

R2 réutilisation : confirmé via `R2Service.signedPutUrl(key, contentType, ttl, bucket)` exposé dans `apps/api/src/common/r2/`.

---

## Execution Handoff

Tu peux dérouler ce plan de deux façons :

### Option A — Subagent-Driven (recommandé)

Un subagent frais par tâche, two-stage review :

```
/sk superpowers:subagent-driven-development
"Execute docs/superpowers/plans/2026-05-25-v2-eleves-module.md task-by-task. One fresh subagent per Task X{n}. After each task : (1) verify subagent committed, (2) launch a reviewer subagent to spot bugs/regressions before moving on."
```

Bénéfices :
- Chaque tâche démarre context-clean (pas de pollution inter-tâches)
- Review systématique → moins de bugs en CI
- Le main agent garde du context budget pour les décisions trans-phases

### Option B — Inline Execution

Tu (le main agent) déroules toutes les tâches dans cette session, avec checkpoints toutes les 2-3 tâches :

```
/sk superpowers:executing-plans docs/superpowers/plans/2026-05-25-v2-eleves-module.md
```

Bénéfices :
- Plus rapide en tokens (pas de spawn overhead)
- Tu vois tout le flow continu

Trade-off : context window pression à partir de Phase F. Si tu sens la pression, switch vers Option A à mi-chemin.

**Recommandation** : Option A pour V2 (scope ~6j, ~26 tâches = trop de surface pour une seule session).
