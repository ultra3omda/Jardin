/**
 * G3 — Observations e2e : création (notif parent), bulk multi-élèves,
 * RBAC parent (ses enfants + visibleToParent) + isolation multi-tenant (R10).
 *
 * Bootstrap identique aux autres e2e (mirror canteen.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, RelationType, Sex, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const TENANT_A_SLUG = 'g3-obs-a';
const TENANT_B_SLUG = 'g3-obs-b';
const EMAIL_DOMAIN = 'g3-obs-test.fr';
const PASSWORD = 'G3ObsTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Observations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let adminB: SeedActor;
  let studentOwned: string;
  let studentOther: string;

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
      data: { id: createId(), name: 'G3 A', slug: TENANT_A_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });
    const tB = await prisma.tenant.create({
      data: { id: createId(), name: 'G3 B', slug: TENANT_B_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    teacherA = await seedUser(prisma, app, tA.id, UserRole.TEACHER, 'teacher-a', pwHash);
    parentA = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    const owned = await prisma.student.create({
      data: {
        id: createId(), tenantId: tA.id, firstName: 'Owned', lastName: 'Kid',
        dateOfBirth: new Date('2022-10-18'), sex: Sex.F, classroom: '3ans', parentEmail: parentA.email,
      },
    });
    const other = await prisma.student.create({
      data: {
        id: createId(), tenantId: tA.id, firstName: 'Other', lastName: 'Kid',
        dateOfBirth: new Date('2022-05-10'), sex: Sex.M, classroom: '3ans', parentEmail: `x@${EMAIL_DOMAIN}`,
      },
    });
    studentOwned = owned.id;
    studentOther = other.id;

    await prisma.parentStudent.create({
      data: {
        id: createId(), tenantId: tA.id, parentUserId: parentA.id, studentId: studentOwned,
        relationType: RelationType.MOTHER, isPrimaryContact: true,
      },
    });
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  const obsBody = (studentId: string, extra: Record<string, unknown> = {}) => ({
    studentId,
    category: 'LANGAGE',
    title: 'Progrès en langage',
    content: 'A bien participé.',
    observedAt: new Date().toISOString(),
    ...extra,
  });

  it('TEACHER crée une observation visible parent (201)', async () => {
    await request(app.getHttpServer())
      .post('/api/observations')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send(obsBody(studentOwned))
      .expect(201);
  });

  it('TEACHER crée une observation privée (visibleToParent=false)', async () => {
    await request(app.getHttpServer())
      .post('/api/observations')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send(obsBody(studentOwned, { title: 'Note privée', visibleToParent: false }))
      .expect(201);
  });

  it('bulk : une observation pour plusieurs élèves partage un batchId', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/observations/bulk')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({
        studentIds: [studentOwned, studentOther],
        category: 'SOCIAL',
        title: 'Sortie au parc',
        content: 'Bonne journée.',
        observedAt: new Date().toISOString(),
      })
      .expect(201);
    expect(res.body.created).toBe(2);
    expect(res.body.batchId).toBeTruthy();
  });

  it('RBAC : le parent voit ses enfants visibles, pas les privées ni les autres élèves', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/observations')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const titles = res.body.map((o: { title: string; studentId: string }) => o.title);
    expect(titles).toContain('Progrès en langage');
    expect(titles).toContain('Sortie au parc');
    expect(titles).not.toContain('Note privée');
    expect(res.body.every((o: { studentId: string }) => o.studentId === studentOwned)).toBe(true);
  });

  it('RBAC : un PARENT ne peut pas créer une observation (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/observations')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send(obsBody(studentOwned))
      .expect(403);
  });

  it('ISOLATION : le tenant B ne voit aucune observation du tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/observations')
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
  await prisma.observationMedia.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.observation.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.parentStudent.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.student.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.notification.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [{ tenant: { slug: { in: slugs } } }, { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } }],
      },
    })
    .catch(() => undefined);
  await prisma.refreshToken
    .deleteMany({ where: { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } } })
    .catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } }).catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: { in: slugs } } }).catch(() => undefined);
}
