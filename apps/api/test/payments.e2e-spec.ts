/**
 * GTM — Payments e2e (via MockGateway; CLICTOPAY_USER unset → mock selected).
 *
 * Couvre : checkout (SCHOOL_ADMIN → 201 + redirectUrl) ; TEACHER → 403 ;
 * callback ClicToPay → 200 ; vérification serveur → transaction PAID +
 * abonnement ACTIVE ; idempotence du callback.
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

const TENANT_SLUG = 'gtm-pay-a';
const EMAIL_DOMAIN = 'gtm-pay-test.fr';
const PASSWORD = 'GtmPayTest1234!';
const PLAN_CODE = 'gtm-pay-std-monthly';

interface Actor {
  id: string;
  accessToken: string;
}

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let admin: Actor;
  let teacher: Actor;

  beforeAll(async () => {
    const fakeR2 = {
      signedPutUrl: vi.fn().mockResolvedValue('https://signed.r2.example/x?sig=mock'),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(R2Service)
      .useValue(fakeR2)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await cleanup(prisma);

    const t = await prisma.tenant.create({
      data: { id: createId(), name: 'GTM Pay A', slug: TENANT_SLUG, type: TenantType.PRIMARY_SCHOOL, locale: Locale.fr },
    });
    tenantId = t.id;
    await prisma.subscriptionPlan.create({
      data: {
        id: createId(),
        code: PLAN_CODE,
        name: 'Standard mensuel',
        interval: 'MONTHLY',
        price: new Prisma.Decimal('49.000'),
        currency: 'TND',
      },
    });

    const pw = await bcrypt.hash(PASSWORD, 4);
    admin = await seedUser(prisma, app, tenantId, UserRole.SCHOOL_ADMIN, 'admin', pw);
    teacher = await seedUser(prisma, app, tenantId, UserRole.TEACHER, 'teacher', pw);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('TEACHER cannot checkout (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/payments/checkout')
      .set('Authorization', `Bearer ${teacher.accessToken}`)
      .send({ planCode: PLAN_CODE })
      .expect(403);
  });

  it('full flow: checkout → callback → transaction PAID + subscription ACTIVE', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/api/payments/checkout')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ planCode: PLAN_CODE })
      .expect(201);
    expect(checkout.body.orderNumber).toMatch(/^SUB/);
    expect(checkout.body.redirectUrl).toContain('mock=1');
    const orderNumber = checkout.body.orderNumber as string;

    // ClicToPay S2S callback — must 200; server re-verifies via getStatus.
    await request(app.getHttpServer())
      .get(`/api/payments/callback?orderNumber=${orderNumber}&operation=deposited&status=1`)
      .expect(200);

    const tx = await prisma.paymentTransaction.findUnique({ where: { orderNumber } });
    expect(tx?.status).toBe('PAID');
    expect(tx?.tenantId).toBe(tenantId);

    const sub = await request(app.getHttpServer())
      .get('/api/subscriptions/me')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(sub.body.status).toBe('ACTIVE');
    expect(sub.body.planCode).toBe(PLAN_CODE);
    expect(sub.body.currentPeriodEnd).toBeTruthy();

    // Idempotent: a second callback keeps it PAID (no double-activation error).
    await request(app.getHttpServer())
      .get(`/api/payments/callback?orderNumber=${orderNumber}&operation=deposited&status=1`)
      .expect(200);
    const tx2 = await prisma.paymentTransaction.findUnique({ where: { orderNumber } });
    expect(tx2?.status).toBe('PAID');
  });
});

async function seedUser(
  prisma: PrismaService,
  app: INestApplication,
  tenantId: string,
  role: UserRole,
  prefix: string,
  passwordHash: string,
): Promise<Actor> {
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
  return { id: user.id, accessToken: login.body.accessToken };
}

async function cleanup(prisma: PrismaService): Promise<void> {
  await prisma.paymentTransaction
    .deleteMany({ where: { tenant: { slug: TENANT_SLUG } } })
    .catch(() => undefined);
  await prisma.tenantSubscription
    .deleteMany({ where: { tenant: { slug: TENANT_SLUG } } })
    .catch(() => undefined);
  await prisma.subscriptionPlan.deleteMany({ where: { code: PLAN_CODE } }).catch(() => undefined);
  await prisma.refreshToken
    .deleteMany({ where: { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } } })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: TENANT_SLUG } }).catch(() => undefined);
}
