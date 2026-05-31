/**
 * T2b PR-2 — Student-health e2e: RBAC + parent scoping + persistence.
 *
 * Couvre (tenant A) les 3 ressources /health-records, /infirmary-visits, /vaccinations :
 *  - health-records : POST STAFF → 201 ; TEACHER → 403 ; PARENT → 403 ; 2e POST même élève → 400
 *    (HEALTH_RECORD_ALREADY_EXISTS) ; GET PARENT → enfants possédés ; GET /:id non possédé → 403.
 *  - infirmary-visits : POST STAFF (outcome SENT_HOME) → 201 ; PARENT → 403 ; GET PARENT → possédés.
 *  - vaccinations : POST SCHOOL_ADMIN → 201 ; TEACHER → 403 ; GET PARENT → possédés.
 *
 * TEACHER n'a AUCUN accès santé (§4.8).
 * Bootstrap identique aux autres e2e (mirror journal.e2e-spec.ts).
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

const TENANT_A_SLUG = 't2b-health-a';
const EMAIL_DOMAIN = 't2b-health-test.fr';
const PASSWORD = 'T2bHealthTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Student-health (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let staffA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let studentOwned: string;
  let studentOther: string;
  let recordOther: string;

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

    const tA = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'T2b Health A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    staffA = await seedUser(prisma, app, tenantAId, UserRole.STAFF, 'staff-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
    parentA = await seedUser(prisma, app, tenantAId, UserRole.PARENT, 'parent-a', pwHash);

    const sOwned = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Owned',
        lastName: 'Kid',
        dateOfBirth: new Date('2017-09-15'),
        sex: Sex.F,
        classroom: 'CP-A',
        parentEmail: parentA.email,
      },
    });
    const sOther = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Other',
        lastName: 'Kid',
        dateOfBirth: new Date('2017-04-10'),
        sex: Sex.M,
        classroom: 'CP-B',
        parentEmail: `someone-else@${EMAIL_DOMAIN}`,
      },
    });
    studentOwned = sOwned.id;
    studentOther = sOther.id;

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

    // Pre-seed a health record on the non-owned student for the 403 path.
    const other = await prisma.healthRecord.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOther,
        allergies: 'Confidentiel',
        updatedById: schoolAdminA.id,
      },
    });
    recordOther = other.id;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  // ─── health-records ───────────────────────────────────────────────────────

  it('STAFF creates a health record for the owned student (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/health-records')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ studentId: studentOwned, bloodType: 'A+', allergies: 'Aucune' })
      .expect(201);
    expect(res.body.studentId).toBe(studentOwned);
    expect(res.body.bloodType).toBe('A+');
  });

  it('a second health record for the same student is rejected (400 HEALTH_RECORD_ALREADY_EXISTS)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/health-records')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ studentId: studentOwned })
      .expect(400);
    expect(res.body.code).toBe('HEALTH_RECORD_ALREADY_EXISTS');
  });

  it('TEACHER has no access to health records (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/health-records')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(403);
  });

  it('PARENT cannot create a health record (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/health-records')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOwned })
      .expect(403);
  });

  it('PARENT list returns only records for owned children', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health-records')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; studentId: string }>;
    for (const e of items) expect(e.studentId).toBe(studentOwned);
    expect(items.map((e) => e.id)).not.toContain(recordOther);
  });

  it('PARENT reading a non-owned record is forbidden (403 STUDENT_NOT_OWNED_BY_PARENT)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/health-records/${recordOther}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(403);
    expect(res.body.code).toBe('STUDENT_NOT_OWNED_BY_PARENT');
  });

  // ─── infirmary-visits ───────────────────────────────────────────────────────

  it('STAFF records an infirmary visit (SENT_HOME) → 201; PARENT → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/infirmary-visits')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({
        studentId: studentOwned,
        visitedAt: '2026-05-22T09:30:00.000Z',
        reason: 'Fièvre',
        outcome: 'SENT_HOME',
      })
      .expect(201);
    expect(res.body.outcome).toBe('SENT_HOME');

    await request(app.getHttpServer())
      .post('/api/infirmary-visits')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOwned, visitedAt: '2026-05-23T09:30:00.000Z', reason: 'X' })
      .expect(403);
  });

  it('PARENT infirmary list returns only owned children', async () => {
    await prisma.infirmaryVisit.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOther,
        visitedAt: new Date('2026-05-22T10:00:00.000Z'),
        reason: 'Confidentiel',
        recordedById: schoolAdminA.id,
      },
    });
    const res = await request(app.getHttpServer())
      .get('/api/infirmary-visits')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ studentId: string }>;
    for (const e of items) expect(e.studentId).toBe(studentOwned);
    expect(items.map((e) => e.studentId)).not.toContain(studentOther);
  });

  // ─── vaccinations ─────────────────────────────────────────────────────────

  it('SCHOOL_ADMIN records a vaccination → 201; TEACHER → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/vaccinations')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ studentId: studentOwned, vaccineName: 'DTP', administeredAt: '2025-09-15' })
      .expect(201);
    expect(res.body.vaccineName).toBe('DTP');
    expect(res.body.administeredAt).toBe('2025-09-15');

    await request(app.getHttpServer())
      .post('/api/vaccinations')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ studentId: studentOwned, vaccineName: 'ROR', administeredAt: '2025-09-15' })
      .expect(403);
  });

  it('PARENT vaccination list returns only owned children', async () => {
    await prisma.vaccination.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOther,
        vaccineName: 'Confidentiel',
        administeredAt: new Date('2025-09-15'),
        recordedById: schoolAdminA.id,
      },
    });
    const res = await request(app.getHttpServer())
      .get('/api/vaccinations')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ studentId: string }>;
    for (const e of items) expect(e.studentId).toBe(studentOwned);
    expect(items.map((e) => e.studentId)).not.toContain(studentOther);
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
  // FK-safe order: leaf medical rows before students, then audit/refresh, users, tenant.
  await prisma.vaccination
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.infirmaryVisit
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.healthRecord
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
