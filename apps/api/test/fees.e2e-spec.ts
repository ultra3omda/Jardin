/**
 * G2 — Fees (référentiel de frais) e2e : CRUD + bulk assign + impayés
 * + RBAC + isolation multi-tenant (R10).
 *
 * Bootstrap identique aux autres e2e (mirror canteen.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, Sex, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const TENANT_A_SLUG = 'g2-fees-a';
const TENANT_B_SLUG = 'g2-fees-b';
const EMAIL_DOMAIN = 'g2-fees-test.fr';
const PASSWORD = 'G2FeesTest1234!';
const SCHOOL_YEAR = '2025-2026';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Fees (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminA: SeedActor;
  let parentA: SeedActor;
  let adminB: SeedActor;
  let classAId: string;
  let feeTypeId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
        name: 'G2 Fees A',
        slug: TENANT_A_SLUG,
        type: TenantType.KINDERGARTEN,
        locale: Locale.fr,
      },
    });
    const tB = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'G2 Fees B',
        slug: TENANT_B_SLUG,
        type: TenantType.KINDERGARTEN,
        locale: Locale.fr,
      },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    adminA = await seedUser(prisma, app, tA.id, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    parentA = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    const classA = await prisma.class.create({
      data: {
        id: createId(),
        tenantId: tA.id,
        name: '3ans-Les poussins',
        level: '3ans',
        schoolYear: SCHOOL_YEAR,
      },
    });
    classAId = classA.id;

    for (const name of ['Kid One', 'Kid Two']) {
      const [firstName, lastName] = name.split(' ');
      await prisma.student.create({
        data: {
          id: createId(),
          tenantId: tA.id,
          firstName,
          lastName,
          dateOfBirth: new Date('2022-10-18'),
          sex: Sex.F,
          classroom: classA.name,
          classId: classA.id,
          parentEmail: parentA.email,
        },
      });
    }
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('SCHOOL_ADMIN crée un type de frais (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/billing/fee-types')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({
        name: 'FRAIS SCOLARITE',
        category: 'STANDARD',
        defaultAmount: 900,
        recurrence: 'YEARLY',
        schoolYear: SCHOOL_YEAR,
      })
      .expect(201);
    expect(res.body.name).toBe('FRAIS SCOLARITE');
    feeTypeId = res.body.id;
  });

  it('affecte le frais en masse à une classe (2 élèves)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/billing/fee-assignments/bulk')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ feeTypeId, classId: classAId, schoolYear: SCHOOL_YEAR, installments: 3 })
      .expect(201);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toBe(0);
  });

  it('affectation idempotente : 2e passage skippe les existants', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/billing/fee-assignments/bulk')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ feeTypeId, classId: classAId, schoolYear: SCHOOL_YEAR, installments: 3 })
      .expect(201);
    expect(res.body.created).toBe(0);
    expect(res.body.skipped).toBe(2);
  });

  it('liste les impayés (échéances PENDING)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/billing/unpaid')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    // 2 élèves × 3 tranches = 6 échéances impayées
    expect(res.body.length).toBe(6);
    expect(res.body[0]).toHaveProperty('studentName');
    expect(res.body[0]).toHaveProperty('amount');
  });

  it('RBAC : un PARENT ne peut pas créer un type de frais (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/billing/fee-types')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({
        name: 'X',
        category: 'DIVERS',
        defaultAmount: 1,
        recurrence: 'ONCE',
        schoolYear: SCHOOL_YEAR,
      })
      .expect(403);
  });

  it('ISOLATION : le tenant B ne voit pas les frais du tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/billing/fee-types')
      .set('Authorization', `Bearer ${adminB.accessToken}`)
      .expect(200);
    expect(res.body.find((f: { id: string }) => f.id === feeTypeId)).toBeUndefined();
  });
});

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
  const slugs = [TENANT_A_SLUG, TENANT_B_SLUG];
  await prisma.feeInstallment
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.feeAssignment
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.feeType
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.parentStudent
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.student
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.class
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [
          { tenant: { slug: { in: slugs } } },
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
  await prisma.tenant.deleteMany({ where: { slug: { in: slugs } } }).catch(() => undefined);
}
