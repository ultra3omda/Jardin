/**
 * T2b — Journal (cahier de liaison) e2e: RBAC + parent scoping + persistence.
 *
 * Couvre (tenant A, single tenant) :
 *  - POST /journal (pour studentOwned) : TEACHER → 201 ; PARENT → 403 (write = ADMIN/TEACHER).
 *  - GET /journal en PARENT → ne retourne QUE les entrées des enfants liés
 *    (studentOwned via ParentStudent), jamais studentOther.
 *  - (régression) GET /journal?studentId=<studentOther.id> en PARENT → ne fuit PAS
 *    les données de studentOther : la réponse reste limitée aux enfants possédés.
 *  - GET /journal/:id sur une entrée de studentOther en PARENT → 403
 *    body `code: 'STUDENT_NOT_OWNED_BY_PARENT'`.
 *  - Persistance : create en TEACHER → GET /journal (admin) inclut l'entrée.
 *
 * Bootstrap identique aux autres e2e (mirror students.e2e-spec.ts) :
 * AppModule complet + R2Service mocké + ValidationPipe + prefix `api`.
 * Requires same env (DATABASE_URL, JWT_*_SECRET, migrations appliquées).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, RelationType, Sex, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const TENANT_A_SLUG = 't2b-journal-a';
const EMAIL_DOMAIN = 't2b-journal-test.fr';
const PASSWORD = 'T2bJournalTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Journal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let studentOwned: string;
  let studentOther: string;
  // A journal entry on the non-owned student, seeded as admin for the 403 test.
  let entryOther: string;

  beforeAll(async () => {
    const fakeR2 = {
      signedPutUrl: vi
        .fn()
        .mockImplementation(async (key: string) => `https://signed.r2.example/${key}?sig=mock`),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(R2Service)
      .useValue(fakeR2)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await cleanup(prisma);

    // — Tenant —
    const tA = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'T2b Journal A',
        slug: TENANT_A_SLUG,
        type: TenantType.KINDERGARTEN,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    // — Users —
    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
    parentA = await seedUser(prisma, app, tenantAId, UserRole.PARENT, 'parent-a', pwHash);

    // — Students : one linked to the parent (owned), one not (other) —
    const sOwned = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Owned',
        lastName: 'Kid',
        dateOfBirth: new Date('2020-09-15'),
        sex: Sex.F,
        classroom: 'PS-A',
        parentEmail: parentA.email,
      },
    });
    const sOther = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Other',
        lastName: 'Kid',
        dateOfBirth: new Date('2020-04-10'),
        sex: Sex.M,
        classroom: 'PS-B',
        parentEmail: `someone-else@${EMAIL_DOMAIN}`,
      },
    });
    studentOwned = sOwned.id;
    studentOther = sOther.id;

    // — Parent ↔ owned student link (journal scoping reads ParentStudent) —
    await prisma.parentStudent.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        parentUserId: parentA.id,
        studentId: studentOwned,
        relationType: RelationType.MOTHER,
        isPrimaryContact: true,
      },
    });

    // — Pre-seed one entry per student (as data) so PARENT list-filtering and the
    //   non-owned 403 path have rows to read. Author = the school admin. —
    await prisma.dailyLogEntry.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOwned,
        date: new Date('2026-05-28'),
        meals: 'A bien mangé',
        mood: 'HAPPY',
        authorId: schoolAdminA.id,
      },
    });
    const otherEntry = await prisma.dailyLogEntry.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOther,
        date: new Date('2026-05-28'),
        meals: 'Repas normal',
        mood: 'CALM',
        authorId: schoolAdminA.id,
      },
    });
    entryOther = otherEntry.id;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('GET /journal → 401 without bearer token', async () => {
    await request(app.getHttpServer()).get('/api/journal').expect(401);
  });

  it('TEACHER creates a journal entry for the owned student (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/journal')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ studentId: studentOwned, date: '2026-05-29', meals: 'Soupe', mood: 'CALM' })
      .expect(201);
    expect(res.body.studentId).toBe(studentOwned);
    expect(res.body.date).toBe('2026-05-29');
    expect(res.body.mood).toBe('CALM');
  });

  it('PARENT cannot create a journal entry (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/journal')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOwned, date: '2026-05-30', meals: 'X' })
      .expect(403);
  });

  it('PARENT list returns only entries for owned children', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/journal')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; studentId: string }>;
    expect(items.length).toBeGreaterThan(0);
    for (const e of items) {
      expect(e.studentId).toBe(studentOwned);
    }
    expect(items.map((e) => e.studentId)).not.toContain(studentOther);
    expect(items.map((e) => e.id)).not.toContain(entryOther);
  });

  it('PARENT studentId filter on a non-owned student does NOT leak that student data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/journal?studentId=${studentOther}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; studentId: string }>;
    // The non-owned studentId filter must collapse back to owned children only.
    for (const e of items) {
      expect(e.studentId).toBe(studentOwned);
    }
    expect(items.map((e) => e.studentId)).not.toContain(studentOther);
    expect(items.map((e) => e.id)).not.toContain(entryOther);
  });

  it('PARENT reading a non-owned student entry is forbidden (403 STUDENT_NOT_OWNED_BY_PARENT)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/journal/${entryOther}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(403);
    expect(res.body.code).toBe('STUDENT_NOT_OWNED_BY_PARENT');
  });

  it('Persistence: a TEACHER-created entry shows up in the admin list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/journal')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ studentId: studentOwned, date: '2026-05-27', generalNote: 'Persisted entry' })
      .expect(201);
    const newId = created.body.id as string;

    const res = await request(app.getHttpServer())
      .get('/api/journal')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    const ids = (res.body.items as Array<{ id: string }>).map((e) => e.id);
    expect(ids).toContain(newId);
  });
});

// ============================================================================
// Helpers
// ============================================================================

async function seedUser(
  prisma: PrismaService,
  app: INestApplication,
  tenantId: string,
  role: UserRole,
  prefix: string,
  passwordHash: string,
): Promise<SeedActor> {
  const email = `${prefix}@${EMAIL_DOMAIN}`;
  const user = await prisma.user.create({
    data: {
      id: createId(),
      tenantId,
      email,
      passwordHash,
      firstName: prefix,
      lastName: 'E2E',
      role,
      emailVerifiedAt: new Date(),
    },
  });
  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { id: user.id, email, accessToken: login.body.accessToken };
}

async function cleanup(prisma: PrismaService): Promise<void> {
  // FK-safe order: leaf rows (journal entries, parent links) before students,
  // then audit/refresh referencing users, then users, then the tenant.
  await prisma.dailyLogEntry
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.parentStudent
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [
          { tenant: { slug: TENANT_A_SLUG } },
          { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } },
        ],
      },
    })
    .catch(() => undefined);
  await prisma.refreshToken
    .deleteMany({ where: { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } } })
    .catch(() => undefined);
  await prisma.student
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: TENANT_A_SLUG } }).catch(() => undefined);
}
