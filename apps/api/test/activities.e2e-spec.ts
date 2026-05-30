/**
 * T2b — Activités e2e: RBAC + participation uniqueness + parent scoping.
 *
 * Couvre (tenant A, single tenant) :
 *  - POST /activities : TEACHER → 201 ; PARENT → 403 (write = ADMIN/TEACHER).
 *  - GET /activities en PARENT → 200 (catalogue visible aux parents — read = ADMIN/TEACHER/PARENT).
 *  - POST /activities/:id/participations deux fois pour le même élève →
 *    1er 201, 2e **400** body `code: 'PARTICIPATION_ALREADY_EXISTS'`
 *    (P2002 → BadRequestException, donc 400 et NON 403).
 *  - GET /activities/:id/participations en PARENT → ne retourne que les enfants
 *    liés au parent (on inscrit un enfant possédé + un non-possédé en admin ;
 *    le parent ne voit que le sien).
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

const TENANT_A_SLUG = 't2b-activities-a';
const EMAIL_DOMAIN = 't2b-activities-test.fr';
const PASSWORD = 'T2bActivitiesTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Activities (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let studentOwned: string;
  let studentOther: string;

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
        name: 'T2b Activities A',
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

    // — Parent ↔ owned student link (participation scoping reads ParentStudent) —
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
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('GET /activities → 401 without bearer token', async () => {
    await request(app.getHttpServer()).get('/api/activities').expect(401);
  });

  it('TEACHER creates an activity (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/activities')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ name: 'Chorale', category: 'MUSIC' })
      .expect(201);
    expect(res.body.name).toBe('Chorale');
    expect(res.body.category).toBe('MUSIC');
    expect(res.body.participantCount).toBe(0);
  });

  it('PARENT cannot create an activity (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/activities')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ name: 'Forbidden', category: 'ART' })
      .expect(403);
  });

  it('PARENT can read the activity catalogue (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/activities')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });

  it('adding the same student to an activity twice → 201 then 400 PARTICIPATION_ALREADY_EXISTS', async () => {
    const activity = await request(app.getHttpServer())
      .post('/api/activities')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ name: 'Atelier Peinture', category: 'ART' })
      .expect(201);
    const activityId = activity.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/participations`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ studentId: studentOwned })
      .expect(201);

    // P2002 unique violation maps to BadRequestException (400), NOT Forbidden.
    const dup = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/participations`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ studentId: studentOwned })
      .expect(400);
    expect(dup.body.code).toBe('PARTICIPATION_ALREADY_EXISTS');
  });

  it('PARENT listing participations sees only their own children', async () => {
    // Admin sets up an activity with one owned + one non-owned participant.
    const activity = await request(app.getHttpServer())
      .post('/api/activities')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ name: 'Club Sciences', category: 'OTHER' })
      .expect(201);
    const activityId = activity.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/participations`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ studentId: studentOwned })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/participations`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ studentId: studentOther })
      .expect(201);

    // Admin sees both participants.
    const adminView = await request(app.getHttpServer())
      .get(`/api/activities/${activityId}/participations`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    const adminStudentIds = (adminView.body as Array<{ studentId: string }>).map(
      (p) => p.studentId,
    );
    expect(adminStudentIds).toContain(studentOwned);
    expect(adminStudentIds).toContain(studentOther);

    // Parent sees only the owned child.
    const parentView = await request(app.getHttpServer())
      .get(`/api/activities/${activityId}/participations`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const parentParticipants = parentView.body as Array<{ studentId: string }>;
    for (const p of parentParticipants) {
      expect(p.studentId).toBe(studentOwned);
    }
    expect(parentParticipants.map((p) => p.studentId)).not.toContain(studentOther);
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
  // FK-safe order: participations → activities + parent links → students →
  // audit/refresh (reference users) → users → tenant.
  await prisma.activityParticipation
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.activity
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
