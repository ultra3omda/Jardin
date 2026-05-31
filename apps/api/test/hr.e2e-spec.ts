/**
 * T2c V1 — RH e2e: STAFF listing + contracts RBAC + persistence.
 *
 * Couvre (tenant A) :
 *  - GET /users/staff : SCHOOL_ADMIN → 200 ; TEACHER → 403.
 *  - POST /hr/contracts : SCHOOL_ADMIN → 201 ; TEACHER → 403.
 *  - GET /hr/contracts : un TEACHER ne voit QUE ses propres contrats.
 *  - GET /hr/contracts/:id d'un autre employé depuis un TEACHER → 404.
 *  - POST /hr/contracts/:id/end → status ENDED.
 *  - Persistance : contrat créé visible dans la liste admin après relecture.
 *
 * Bootstrap identique aux autres e2e (mirror security.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const TENANT_A_SLUG = 't2c-hr-a';
const EMAIL_DOMAIN = 't2c-hr-test.fr';
const PASSWORD = 'T2cHrTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('HR (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let teacherA: SeedActor;
  let teacherB: SeedActor;

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
        name: 'T2c HR A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
    teacherB = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-b', pwHash);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  // ─── STAFF listing ──────────────────────────────────────────────────────────

  it('SCHOOL_ADMIN lists staff (200); TEACHER → 403', async () => {
    await request(app.getHttpServer())
      .get('/api/users/staff')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/users/staff')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(403);
  });

  // ─── Contracts ────────────────────────────────────────────────────────────────

  it('SCHOOL_ADMIN creates a contract (201); TEACHER → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/hr/contracts')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({
        userId: teacherA.id,
        type: 'CDI',
        startDate: '2025-09-01T00:00:00.000Z',
        baseSalary: 2200.5,
        weeklyHours: 35,
      })
      .expect(201);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.baseSalary).toBe('2200.5');

    await request(app.getHttpServer())
      .post('/api/hr/contracts')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ userId: teacherA.id, type: 'CDD', startDate: '2025-09-01T00:00:00.000Z', baseSalary: 1 })
      .expect(403);
  });

  it('a TEACHER only sees their own contracts and cannot read another employee contract', async () => {
    // Admin gives teacherB a contract too.
    const created = await request(app.getHttpServer())
      .post('/api/hr/contracts')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ userId: teacherB.id, type: 'CDD', startDate: '2025-09-01T00:00:00.000Z', baseSalary: 1800 })
      .expect(201);
    const teacherBContractId = created.body.id as string;

    // teacherA list → only their own (teacherB's contract must not leak).
    const list = await request(app.getHttpServer())
      .get('/api/hr/contracts')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(200);
    const ownerIds = (list.body.items as Array<{ userId: string }>).map((c) => c.userId);
    expect(ownerIds.every((id) => id === teacherA.id)).toBe(true);

    // teacherA reading teacherB's contract by id → 404.
    await request(app.getHttpServer())
      .get(`/api/hr/contracts/${teacherBContractId}`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(404);
  });

  it('ends a contract (status ENDED) and it persists in the admin list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/hr/contracts')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ userId: teacherA.id, type: 'VACATAIRE', startDate: '2025-09-01T00:00:00.000Z', baseSalary: 900 })
      .expect(201);
    const id = created.body.id as string;

    const ended = await request(app.getHttpServer())
      .post(`/api/hr/contracts/${id}/end`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(201);
    expect(ended.body.status).toBe('ENDED');
    expect(ended.body.endDate).toBeTruthy();

    const list = await request(app.getHttpServer())
      .get('/api/hr/contracts')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    expect((list.body.items as Array<{ id: string }>).map((c) => c.id)).toContain(id);
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
  await prisma.employmentContract
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
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: TENANT_A_SLUG } }).catch(() => undefined);
}
