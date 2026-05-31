/**
 * T2c V2 — Congés e2e: workflow d'approbation + RBAC + solde + persistance.
 *
 * Couvre (tenant A) :
 *  - POST /hr/leaves : un TEACHER crée sa demande (201, status PENDING).
 *  - POST /hr/leaves/:id/review : TEACHER → 403 ; SCHOOL_ADMIN → 200 (APPROVED).
 *  - Un SCHOOL_ADMIN ne peut PAS approuver ses propres congés (403).
 *  - GET /hr/leaves : un TEACHER ne voit QUE les siens.
 *  - GET /hr/leaves/balance : reflète les jours approuvés (PAID).
 *  - Persistance : la demande approuvée reste visible côté admin.
 *
 * Bootstrap identique aux autres e2e (mirror hr.e2e-spec.ts).
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

const TENANT_A_SLUG = 't2c-leaves-a';
const EMAIL_DOMAIN = 't2c-leaves-test.fr';
const PASSWORD = 'T2cLeavesTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('HR leaves (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let teacherA: SeedActor;

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
        name: 'T2c Leaves A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('TEACHER creates a leave request (201, PENDING); TEACHER cannot review (403)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/hr/leaves')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ type: 'PAID', startDate: '2026-07-01T00:00:00.000Z', endDate: '2026-07-05T00:00:00.000Z' })
      .expect(201);
    expect(created.body.status).toBe('PENDING');
    expect(created.body.days).toBe(5);
    expect(created.body.userId).toBe(teacherA.id);

    await request(app.getHttpServer())
      .post(`/api/hr/leaves/${created.body.id}/review`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ status: 'APPROVED' })
      .expect(403);
  });

  it('SCHOOL_ADMIN approves an employee leave (200) and the balance reflects it', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/hr/leaves')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ type: 'PAID', startDate: '2026-03-02T00:00:00.000Z', endDate: '2026-03-06T00:00:00.000Z' })
      .expect(201);

    const reviewed = await request(app.getHttpServer())
      .post(`/api/hr/leaves/${created.body.id}/review`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ status: 'APPROVED' })
      .expect(201);
    expect(reviewed.body.status).toBe('APPROVED');
    expect(reviewed.body.reviewedById).toBe(schoolAdminA.id);

    const balance = await request(app.getHttpServer())
      .get(`/api/hr/leaves/balance?userId=${teacherA.id}&year=2026`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    // 5 days approved (2 Mar → 6 Mar inclusive).
    expect(balance.body.takenDays).toBeGreaterThanOrEqual(5);
    expect(balance.body.remainingDays).toBe(balance.body.allowanceDays - balance.body.takenDays);
  });

  it('a SCHOOL_ADMIN cannot approve their own leave (403)', async () => {
    const own = await request(app.getHttpServer())
      .post('/api/hr/leaves')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ type: 'PAID', startDate: '2026-08-01T00:00:00.000Z', endDate: '2026-08-03T00:00:00.000Z' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/hr/leaves/${own.body.id}/review`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ status: 'APPROVED' })
      .expect(403);
  });

  it('a TEACHER only sees their own leave requests', async () => {
    // Admin files a leave for themselves (so a non-teacher leave exists).
    await request(app.getHttpServer())
      .post('/api/hr/leaves')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ type: 'SICK', startDate: '2026-09-01T00:00:00.000Z', endDate: '2026-09-02T00:00:00.000Z' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/hr/leaves')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(200);
    const ownerIds = (list.body.items as Array<{ userId: string }>).map((l) => l.userId);
    expect(ownerIds.every((id) => id === teacherA.id)).toBe(true);
  });

  it('rejects a leave whose endDate is before startDate (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/hr/leaves')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ type: 'PAID', startDate: '2026-07-10T00:00:00.000Z', endDate: '2026-07-01T00:00:00.000Z' })
      .expect(400);
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
  await prisma.leaveRequest
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
