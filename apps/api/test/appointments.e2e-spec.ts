/**
 * G6 — Appointments e2e : parcours créneau → réservation parent → confirmation,
 * anti double-booking, RBAC + isolation multi-tenant (R10).
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

const TENANT_A_SLUG = 'g6-appt-a';
const TENANT_B_SLUG = 'g6-appt-b';
const EMAIL_DOMAIN = 'g6-appt-test.fr';
const PASSWORD = 'G6ApptTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Appointments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminA: SeedActor;
  let staffA: SeedActor;
  let parentA: SeedActor;
  let adminB: SeedActor;
  let typeId: string;

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
      data: { id: createId(), name: 'G6 A', slug: TENANT_A_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });
    const tB = await prisma.tenant.create({
      data: { id: createId(), name: 'G6 B', slug: TENANT_B_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    adminA = await seedUser(prisma, app, tA.id, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    staffA = await seedUser(prisma, app, tA.id, UserRole.STAFF, 'staff-a', pwHash);
    parentA = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    const type = await request(app.getHttpServer())
      .post('/api/appointments/types')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ name: 'Réunion parent', durationMin: 20 })
      .expect(201);
    typeId = type.body.id;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  const futureSlot = (offsetDays: number) => {
    const start = new Date();
    start.setDate(start.getDate() + offsetDays);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 20 * 60 * 1000);
    return { startsAt: start.toISOString(), endsAt: end.toISOString() };
  };

  it('parcours : créneau → réservation parent → confirmation', async () => {
    const slot = await request(app.getHttpServer())
      .post('/api/appointments/slots')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ staffUserId: staffA.id, ...futureSlot(10) })
      .expect(201);

    const appt = await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ slotId: slot.body.id, typeId })
      .expect(201);
    expect(appt.body.status).toBe('REQUESTED');

    const conf = await request(app.getHttpServer())
      .patch(`/api/appointments/${appt.body.id}`)
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    expect(conf.body.status).toBe('CONFIRMED');
  });

  it('refuse le double-booking (409)', async () => {
    const slot = await request(app.getHttpServer())
      .post('/api/appointments/slots')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ staffUserId: staffA.id, ...futureSlot(11) })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ slotId: slot.body.id, typeId })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ slotId: slot.body.id, typeId })
      .expect(409);
  });

  it('RBAC : un STAFF ne peut pas réserver (403)', async () => {
    const slot = await request(app.getHttpServer())
      .post('/api/appointments/slots')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ staffUserId: staffA.id, ...futureSlot(12) })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/appointments')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ slotId: slot.body.id, typeId })
      .expect(403);
  });

  it('ISOLATION : le tenant B ne voit pas les rendez-vous du tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/appointments')
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
      id: createId(), tenantId, email, passwordHash, firstName: prefix, lastName: 'E2E',
      role, emailVerifiedAt: new Date(),
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
  await prisma.appointment.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.appointmentSlot.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.appointmentType.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.smsLog.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.notification.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: { OR: [{ tenant: { slug: { in: slugs } } }, { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } }] },
    })
    .catch(() => undefined);
  await prisma.refreshToken
    .deleteMany({ where: { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } } })
    .catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } }).catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: { in: slugs } } }).catch(() => undefined);
}
