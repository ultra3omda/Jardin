/**
 * G8 — Calendar & circulars e2e : événements calendrier (validation dates),
 * circulaire avec PDF joint, isolation multi-tenant (R10).
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

const TENANT_A_SLUG = 'g8-cal-a';
const TENANT_B_SLUG = 'g8-cal-b';
const EMAIL_DOMAIN = 'g8-cal-test.fr';
const PASSWORD = 'G8CalTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Calendar & circulars (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminA: SeedActor;
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
      data: { id: createId(), name: 'G8 A', slug: TENANT_A_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });
    const tB = await prisma.tenant.create({
      data: { id: createId(), name: 'G8 B', slug: TENANT_B_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    adminA = await seedUser(prisma, app, tA.id, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('crée un événement de calendrier (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/calendar')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({
        title: 'Vacances de printemps',
        type: 'VACATION',
        startDate: '2026-03-20',
        endDate: '2026-04-05',
        schoolYear: '2025-2026',
      })
      .expect(201);
    expect(res.body.title).toBe('Vacances de printemps');
  });

  it('rejette endDate < startDate (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/calendar')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({
        title: 'Invalide',
        type: 'EVENT',
        startDate: '2026-03-20',
        endDate: '2026-03-10',
        schoolYear: '2025-2026',
      })
      .expect(400);
  });

  it('crée une circulaire avec PDF joint (kind=CIRCULAIRE)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/announcements')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({
        title: 'Circulaire rentrée',
        body: 'Veuillez consulter le PDF.',
        audience: 'PARENTS',
        kind: 'CIRCULAIRE',
        attachmentUrl: 'https://pub.r2.dev/circulars/x.pdf',
      })
      .expect(201);
    expect(res.body.kind).toBe('CIRCULAIRE');
    expect(res.body.attachmentUrl).toContain('.pdf');
  });

  it('ISOLATION : le tenant B ne voit pas le calendrier du tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/calendar')
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
  await prisma.schoolCalendarEvent.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.announcement.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
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
