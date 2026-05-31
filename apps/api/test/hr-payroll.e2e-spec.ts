/**
 * T2c V3 — Paie e2e: génération depuis contrat + composants + émission + RBAC.
 *
 * Couvre (tenant A) :
 *  - POST /hr/payslips : SCHOOL_ADMIN génère depuis le contrat ACTIVE (201, base=gross=net).
 *  - Sans contrat actif → 400 NO_ACTIVE_CONTRACT.
 *  - Ajout d'un composant (gain/retenue) recalcule brut/retenues/net.
 *  - POST /hr/payslips/:id/issue : DRAFT → ISSUED ; composant interdit ensuite (400).
 *  - TEACHER ne génère pas (403) mais lit ses propres bulletins ; ne voit pas ceux d'un autre (404).
 *  - Persistance : bulletin émis visible dans la liste admin.
 *
 * Bootstrap identique aux autres e2e (mirror hr.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, Prisma, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const TENANT_A_SLUG = 't2c-payroll-a';
const EMAIL_DOMAIN = 't2c-payroll-test.fr';
const PASSWORD = 'T2cPayrollTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('HR payroll (e2e)', () => {
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
        name: 'T2c Payroll A',
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

    // teacherA has an ACTIVE contract; teacherB has none.
    await prisma.employmentContract.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        userId: teacherA.id,
        type: 'CDI',
        startDate: new Date('2025-09-01T00:00:00.000Z'),
        baseSalary: new Prisma.Decimal('2000.000'),
      },
    });
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('generates a payslip from the active contract (201; base = gross = net)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/hr/payslips')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ userId: teacherA.id, period: '2026-05' })
      .expect(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.baseSalary).toBe('2000');
    expect(res.body.grossSalary).toBe('2000');
    expect(res.body.netSalary).toBe('2000');
  });

  it('returns 400 when the employee has no active contract', async () => {
    await request(app.getHttpServer())
      .post('/api/hr/payslips')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ userId: teacherB.id, period: '2026-05' })
      .expect(400);
  });

  it('adds components (recompute) then issues; components locked after ISSUED', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/hr/payslips')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ userId: teacherA.id, period: '2026-06' })
      .expect(201);
    const id = created.body.id as string;

    const withBonus = await request(app.getHttpServer())
      .post(`/api/hr/payslips/${id}/components`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ label: 'Prime', kind: 'EARNING', amount: 150 })
      .expect(201);
    expect(withBonus.body.grossSalary).toBe('2150');

    const withDeduction = await request(app.getHttpServer())
      .post(`/api/hr/payslips/${id}/components`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ label: 'Avance', kind: 'DEDUCTION', amount: 50 })
      .expect(201);
    expect(withDeduction.body.totalDeductions).toBe('50');
    expect(withDeduction.body.netSalary).toBe('2100');

    const issued = await request(app.getHttpServer())
      .post(`/api/hr/payslips/${id}/issue`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(201);
    expect(issued.body.status).toBe('ISSUED');
    expect(issued.body.issuedAt).toBeTruthy();

    // Components are locked once issued.
    await request(app.getHttpServer())
      .post(`/api/hr/payslips/${id}/components`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ label: 'Trop tard', kind: 'EARNING', amount: 10 })
      .expect(400);

    // Persists in the admin list.
    const list = await request(app.getHttpServer())
      .get('/api/hr/payslips')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    expect((list.body.items as Array<{ id: string }>).map((p) => p.id)).toContain(id);
  });

  it('a TEACHER cannot generate (403) but reads their own and not another employee payslip', async () => {
    await request(app.getHttpServer())
      .post('/api/hr/payslips')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ userId: teacherA.id, period: '2026-07' })
      .expect(403);

    // teacherA only sees their own payslips.
    const list = await request(app.getHttpServer())
      .get('/api/hr/payslips')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(200);
    const ownerIds = (list.body.items as Array<{ userId: string }>).map((p) => p.userId);
    expect(ownerIds.every((uid) => uid === teacherA.id)).toBe(true);

    // teacherB (no payslip of teacherA) cannot read teacherA's payslip by id.
    const someA = (list.body.items as Array<{ id: string }>)[0];
    if (someA) {
      await request(app.getHttpServer())
        .get(`/api/hr/payslips/${someA.id}`)
        .set('Authorization', `Bearer ${teacherB.accessToken}`)
        .expect(404);
    }
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
  await prisma.payslipComponent
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.payslip
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
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
