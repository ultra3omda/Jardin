/**
 * G5 — Activity reports e2e : upsert idempotent, rendu PDF, RBAC parent
 * (enfant participant), isolation multi-tenant (R10).
 *
 * Bootstrap identique aux autres e2e (mirror canteen.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, RelationType, Sex, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { ActivityReportPdfService } from '../src/activities/activity-report-pdf.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

const TENANT_A_SLUG = 'g5-report-a';
const TENANT_B_SLUG = 'g5-report-b';
const EMAIL_DOMAIN = 'g5-report-test.fr';
const PASSWORD = 'G5ReportTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Activity reports (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let teacherA: SeedActor;
  let parentYes: SeedActor;
  let parentNo: SeedActor;
  let adminB: SeedActor;
  let activityId: string;

  beforeAll(async () => {
    // Le rendu @react-pdf (import ESM dynamique) n'est pas exécutable sous Vitest ;
    // on le mocke ici (le pattern de rendu réel est partagé avec les bulletins, prouvé en prod).
    const fakePdf = {
      render: vi.fn().mockResolvedValue(Buffer.from(`%PDF-1.4\n${'x'.repeat(1024)}`)),
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ActivityReportPdfService)
      .useValue(fakePdf)
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
      data: { id: createId(), name: 'G5 A', slug: TENANT_A_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });
    const tB = await prisma.tenant.create({
      data: { id: createId(), name: 'G5 B', slug: TENANT_B_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    teacherA = await seedUser(prisma, app, tA.id, UserRole.TEACHER, 'teacher-a', pwHash);
    parentYes = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-yes', pwHash);
    parentNo = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-no', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    const studentYes = await prisma.student.create({
      data: {
        id: createId(), tenantId: tA.id, firstName: 'Part', lastName: 'Icipant',
        dateOfBirth: new Date('2022-10-18'), sex: Sex.F, classroom: '3ans', parentEmail: parentYes.email,
      },
    });
    const studentNo = await prisma.student.create({
      data: {
        id: createId(), tenantId: tA.id, firstName: 'Non', lastName: 'Participant',
        dateOfBirth: new Date('2022-05-10'), sex: Sex.M, classroom: '3ans', parentEmail: parentNo.email,
      },
    });
    await prisma.parentStudent.create({
      data: {
        id: createId(), tenantId: tA.id, parentUserId: parentYes.id, studentId: studentYes.id,
        relationType: RelationType.MOTHER, isPrimaryContact: true,
      },
    });
    await prisma.parentStudent.create({
      data: {
        id: createId(), tenantId: tA.id, parentUserId: parentNo.id, studentId: studentNo.id,
        relationType: RelationType.FATHER, isPrimaryContact: true,
      },
    });

    const activity = await prisma.activity.create({
      data: { id: createId(), tenantId: tA.id, name: 'Sortie au parc', category: 'OUTING' },
    });
    activityId = activity.id;
    await prisma.activityParticipation.create({
      data: { id: createId(), tenantId: tA.id, activityId, studentId: studentYes.id },
    });
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('TEACHER crée le rapport (idempotent : 1 rapport/activité)', async () => {
    const r1 = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/report`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ title: 'Belle journée', summary: 'Les enfants ont adoré.' })
      .expect(201);
    const r2 = await request(app.getHttpServer())
      .post(`/api/activities/${activityId}/report`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ title: 'Belle journée v2', summary: '...' })
      .expect(201);
    expect(r2.body.id).toBe(r1.body.id);
  });

  it('génère le PDF (application/pdf, non vide)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/activities/${activityId}/report/pdf`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(Number(res.headers['content-length'])).toBeGreaterThan(500);
  });

  it('RBAC : le parent dont l’enfant participe accède au PDF (200)', async () => {
    await request(app.getHttpServer())
      .get(`/api/activities/${activityId}/report/pdf`)
      .set('Authorization', `Bearer ${parentYes.accessToken}`)
      .expect(200);
  });

  it('RBAC : le parent dont l’enfant ne participe pas est refusé (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/activities/${activityId}/report/pdf`)
      .set('Authorization', `Bearer ${parentNo.accessToken}`)
      .expect(403);
  });

  it('ISOLATION : le tenant B ne lit pas le rapport du tenant A (null)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/activities/${activityId}/report`)
      .set('Authorization', `Bearer ${adminB.accessToken}`)
      .expect(200);
    // null renvoyé → corps vide (supertest parse en {})
    expect(res.body?.id ?? null).toBeNull();
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
  await prisma.activityReport.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.activityParticipation.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.activity.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.parentStudent.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.student.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
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
