/**
 * G1 — Cash register e2e : ouverture/clôture (écart), refus double session,
 * mouvements, RBAC + isolation multi-tenant (R10).
 *
 * Bootstrap identique aux autres e2e (mirror canteen.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const TENANT_A_SLUG = 'g1-cash-a';
const TENANT_B_SLUG = 'g1-cash-b';
const EMAIL_DOMAIN = 'g1-cash-test.fr';
const PASSWORD = 'G1CashTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('CashRegister (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminA: SeedActor;
  let parentA: SeedActor;
  let adminB: SeedActor;

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
        name: 'G1 Cash A',
        slug: TENANT_A_SLUG,
        type: TenantType.KINDERGARTEN,
        locale: Locale.fr,
      },
    });
    const tB = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'G1 Cash B',
        slug: TENANT_B_SLUG,
        type: TenantType.KINDERGARTEN,
        locale: Locale.fr,
      },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    adminA = await seedUser(prisma, app, tA.id, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    parentA = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('ouvre, ajoute des mouvements, clôture avec écart', async () => {
    const open = await request(app.getHttpServer())
      .post('/api/cash-register/open')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ openingFloat: 100 })
      .expect(201);
    const sid = open.body.id;

    await request(app.getHttpServer())
      .post(`/api/cash-register/${sid}/movements`)
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ kind: 'INCOME', amount: 520, label: 'paiement' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/cash-register/${sid}/movements`)
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ kind: 'EXPENSE', amount: 20, label: 'achat' })
      .expect(201);

    const close = await request(app.getHttpServer())
      .post(`/api/cash-register/${sid}/close`)
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ countedAmount: 599.5 })
      .expect(201);
    expect(Number(close.body.expectedAmount)).toBe(600);
    expect(Number(close.body.variance)).toBeCloseTo(-0.5, 3);
    expect(close.body.status).toBe('CLOSED');
  });

  it('refuse une 2e session ouverte (409)', async () => {
    await request(app.getHttpServer())
      .post('/api/cash-register/open')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ openingFloat: 50 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/cash-register/open')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ openingFloat: 50 })
      .expect(409);
  });

  it('RBAC : un PARENT ne peut pas ouvrir la caisse (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/cash-register/open')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ openingFloat: 10 })
      .expect(403);
  });

  it('ISOLATION : le tenant B ne voit pas les clôtures du tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/cash-register/closures')
      .set('Authorization', `Bearer ${adminB.accessToken}`)
      .expect(200);
    expect(res.body.length).toBe(0);
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
  await prisma.cashMovement
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.cashRegisterSession
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.expense
    .deleteMany({ where: { tenant: { slug: { in: slugs } } } })
    .catch(() => undefined);
  await prisma.supplier
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
