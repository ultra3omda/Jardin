/**
 * T2b PR-3 — Transport e2e: RBAC + stops + parent scoping + persistence.
 *
 * Couvre (tenant A) :
 *  - bus-routes : POST STAFF (avec 2 arrêts) → 201 (stops.length === 2) ; TEACHER → 403 ;
 *    GET PARENT → 200 ; POST :id/stops STAFF → 201 ; PARENT → 403.
 *  - transport-assignments : POST STAFF → 201 ; doublon (même élève+ligne+direction) → 400
 *    ASSIGNMENT_ALREADY_EXISTS ; PARENT POST → 403 ; GET PARENT → enfants possédés.
 *
 * Bootstrap identique aux autres e2e (mirror student-health.e2e-spec.ts).
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

const TENANT_A_SLUG = 't2b-transport-a';
const EMAIL_DOMAIN = 't2b-transport-test.fr';
const PASSWORD = 'T2bTransportTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Transport (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let staffA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let studentOwned: string;
  let studentOther: string;
  let routeId: string;

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
        name: 'T2b Transport A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
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
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  // ─── bus-routes ───────────────────────────────────────────────────────────────

  it('STAFF creates a bus route with 2 stops (201); TEACHER → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/bus-routes')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({
        name: 'Ligne A',
        departureTime: '07:15',
        stops: [
          { name: 'Arrêt 1', order: 0 },
          { name: 'Arrêt 2', order: 1, pickupTime: '07:25' },
        ],
      })
      .expect(201);
    expect(res.body.stops).toHaveLength(2);
    routeId = res.body.id as string;

    await request(app.getHttpServer())
      .post('/api/bus-routes')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ name: 'Ligne B', departureTime: '07:30' })
      .expect(403);
  });

  it('PARENT can read the routes (200); STAFF can add a stop, PARENT cannot (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/bus-routes')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/bus-routes/${routeId}/stops`)
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ name: 'Arrêt 3', order: 2 })
      .expect(201);
    expect(res.body.stops).toHaveLength(3);

    await request(app.getHttpServer())
      .post(`/api/bus-routes/${routeId}/stops`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ name: 'Hack', order: 9 })
      .expect(403);
  });

  // ─── transport-assignments ──────────────────────────────────────────────────

  it('STAFF assigns a student (201); duplicate → 400; PARENT → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/transport-assignments')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ studentId: studentOwned, routeId, direction: 'BOTH' })
      .expect(201);

    const dup = await request(app.getHttpServer())
      .post('/api/transport-assignments')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ studentId: studentOwned, routeId, direction: 'BOTH' })
      .expect(400);
    expect(dup.body.code).toBe('ASSIGNMENT_ALREADY_EXISTS');

    await request(app.getHttpServer())
      .post('/api/transport-assignments')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOwned, routeId, direction: 'MORNING' })
      .expect(403);
  });

  it('PARENT assignment list returns only owned children', async () => {
    await prisma.transportAssignment.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        studentId: studentOther,
        routeId,
        direction: 'BOTH',
      },
    });
    const res = await request(app.getHttpServer())
      .get('/api/transport-assignments')
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
  // FK-safe order: assignments → stops → routes, then parent links/students/users.
  await prisma.transportAssignment
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.busStop
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.busRoute
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
