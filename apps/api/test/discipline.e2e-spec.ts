/**
 * T2b PR-2 — Discipline e2e: RBAC + parent scoping + resolution + persistence.
 *
 * Couvre (tenant A, single tenant) :
 *  - POST /discipline (pour studentOwned) : TEACHER → 201 ; PARENT → 403 (write = ADMIN/TEACHER).
 *  - GET /discipline en PARENT → ne retourne QUE les incidents des enfants liés.
 *  - GET /discipline?studentId=<studentOther> en PARENT → ne fuit PAS studentOther.
 *  - GET /discipline/:id sur un incident de studentOther en PARENT → 403
 *    body `code: 'STUDENT_NOT_OWNED_BY_PARENT'`.
 *  - POST /discipline/:id/resolve : TEACHER → 403 ; SCHOOL_ADMIN → 200 (status RESOLVED).
 *  - PATCH / DELETE en TEACHER → 403 (admin-only).
 *  - Persistance : create en TEACHER → GET /discipline (admin) inclut l'incident.
 *
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

const TENANT_A_SLUG = 't2b-discipline-a';
const EMAIL_DOMAIN = 't2b-discipline-test.fr';
const PASSWORD = 'T2bDisciplineTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Discipline (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let studentOwned: string;
  let studentOther: string;
  let incidentOther: string;

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
        name: 'T2b Discipline A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
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

    await prisma.disciplineIncident.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOwned,
        type: 'MINOR',
        occurredAt: new Date('2026-05-18'),
        description: 'Incident élève possédé',
        reportedById: schoolAdminA.id,
      },
    });
    const other = await prisma.disciplineIncident.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOther,
        type: 'MAJOR',
        occurredAt: new Date('2026-05-18'),
        description: 'Incident autre élève',
        reportedById: schoolAdminA.id,
      },
    });
    incidentOther = other.id;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('GET /discipline → 401 without bearer token', async () => {
    await request(app.getHttpServer()).get('/api/discipline').expect(401);
  });

  it('TEACHER creates an incident for the owned student (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/discipline')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({
        studentId: studentOwned,
        type: 'MINOR',
        occurredAt: '2026-05-25',
        description: 'Oubli de matériel',
      })
      .expect(201);
    expect(res.body.studentId).toBe(studentOwned);
    expect(res.body.status).toBe('OPEN');
    expect(res.body.type).toBe('MINOR');
  });

  it('PARENT cannot create an incident (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/discipline')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOwned, type: 'MINOR', occurredAt: '2026-05-26', description: 'X' })
      .expect(403);
  });

  it('PARENT list returns only incidents for owned children', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/discipline')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; studentId: string }>;
    expect(items.length).toBeGreaterThan(0);
    for (const e of items) expect(e.studentId).toBe(studentOwned);
    expect(items.map((e) => e.studentId)).not.toContain(studentOther);
    expect(items.map((e) => e.id)).not.toContain(incidentOther);
  });

  it('PARENT studentId filter on a non-owned student does NOT leak that student data', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/discipline?studentId=${studentOther}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; studentId: string }>;
    for (const e of items) expect(e.studentId).toBe(studentOwned);
    expect(items.map((e) => e.id)).not.toContain(incidentOther);
  });

  it('PARENT reading a non-owned incident is forbidden (403 STUDENT_NOT_OWNED_BY_PARENT)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/discipline/${incidentOther}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(403);
    expect(res.body.code).toBe('STUDENT_NOT_OWNED_BY_PARENT');
  });

  it('TEACHER cannot resolve an incident (403); SCHOOL_ADMIN can (200)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/discipline')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({
        studentId: studentOwned,
        type: 'MAJOR',
        occurredAt: '2026-05-27',
        description: 'À résoudre',
      })
      .expect(201);
    const id = created.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/discipline/${id}/resolve`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ resolutionNote: 'tentative' })
      .expect(403);

    const resolved = await request(app.getHttpServer())
      .post(`/api/discipline/${id}/resolve`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ resolutionNote: 'Convocation des parents effectuée.' })
      .expect(201);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(resolved.body.resolvedById).toBe(schoolAdminA.id);
  });

  it('TEACHER cannot delete an incident (403, admin-only)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/discipline/${incidentOther}`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(403);
  });

  it('Persistence: a TEACHER-created incident shows up in the admin list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/discipline')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({
        studentId: studentOwned,
        type: 'MINOR',
        occurredAt: '2026-05-28',
        description: 'Persisted incident',
      })
      .expect(201);
    const newId = created.body.id as string;

    const res = await request(app.getHttpServer())
      .get('/api/discipline')
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
  // FK-safe order: leaf rows before students, then audit/refresh, users, tenant.
  await prisma.disciplineIncident
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
