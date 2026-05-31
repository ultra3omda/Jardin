/**
 * T2b PR-3 — Canteen e2e: RBAC + parent scoping + persistence.
 *
 * Couvre (tenant A) :
 *  - canteen-menus (niveau école) : POST STAFF → 201 ; TEACHER → 403 ; PARENT → 403 ;
 *    date dupliquée → 400 CANTEEN_MENU_ALREADY_EXISTS ; GET PARENT → 200 (voit les menus).
 *  - meal-plans (1/élève) : POST STAFF → 201 ; PARENT → 403 ; élève dupliqué → 400
 *    MEAL_PLAN_ALREADY_EXISTS ; GET PARENT → enfants possédés ; GET /:id non possédé → 403.
 *
 * Bootstrap identique aux autres e2e (mirror student-health.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, RelationType, Sex, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const TENANT_A_SLUG = 't2b-canteen-a';
const EMAIL_DOMAIN = 't2b-canteen-test.fr';
const PASSWORD = 'T2bCanteenTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Canteen (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let staffA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let studentOwned: string;
  let studentOther: string;
  let planOther: string;

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
        name: 'T2b Canteen A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    const schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    staffA = await seedUser(prisma, app, tenantAId, UserRole.STAFF, 'staff-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
    parentA = await seedUser(prisma, app, tenantAId, UserRole.PARENT, 'parent-a', pwHash);
    void schoolAdminA;

    const sOwned = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Owned',
        lastName: 'Kid',
        dateOfBirth: new Date('2017-09-15'),
        sex: Sex.F,
        classroom: 'CP-A',
        parentEmail: parentA.email,
      },
    });
    const sOther = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Other',
        lastName: 'Kid',
        dateOfBirth: new Date('2017-04-10'),
        sex: Sex.M,
        classroom: 'CP-B',
        parentEmail: `someone-else@${EMAIL_DOMAIN}`,
      },
    });
    studentOwned = sOwned.id;
    studentOther = sOther.id;

    await prisma.parentStudent.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        parentUserId: parentA.id,
        studentId: studentOwned,
        relationType: RelationType.MOTHER,
        isPrimaryContact: true,
      },
    });

    const other = await prisma.mealPlan.create({
      data: { id: createId(), tenantId: tenantAId, studentId: studentOther, regime: 'HALAL' },
    });
    planOther = other.id;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  // ─── canteen-menus ──────────────────────────────────────────────────────────

  it('STAFF creates a canteen menu (201); duplicate date → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/canteen-menus')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ date: '2026-05-25', main: 'Couscous' })
      .expect(201);

    const dup = await request(app.getHttpServer())
      .post('/api/canteen-menus')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ date: '2026-05-25', main: 'Autre' })
      .expect(400);
    expect(dup.body.code).toBe('CANTEEN_MENU_ALREADY_EXISTS');
  });

  it('TEACHER cannot create a canteen menu (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/canteen-menus')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ date: '2026-05-27' })
      .expect(403);
  });

  it('PARENT can read the canteen menus (200) but not create (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/canteen-menus')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/canteen-menus')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ date: '2026-05-28' })
      .expect(403);
  });

  // ─── meal-plans ───────────────────────────────────────────────────────────────

  it('STAFF creates a meal plan (201); duplicate student → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/meal-plans')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ studentId: studentOwned, regime: 'VEGETARIAN' })
      .expect(201);

    const dup = await request(app.getHttpServer())
      .post('/api/meal-plans')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ studentId: studentOwned })
      .expect(400);
    expect(dup.body.code).toBe('MEAL_PLAN_ALREADY_EXISTS');
  });

  it('PARENT meal-plan list returns only owned children', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/meal-plans')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; studentId: string }>;
    for (const e of items) expect(e.studentId).toBe(studentOwned);
    expect(items.map((e) => e.id)).not.toContain(planOther);
  });

  it('PARENT reading a non-owned meal plan is forbidden (403)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/meal-plans/${planOther}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(403);
    expect(res.body.code).toBe('STUDENT_NOT_OWNED_BY_PARENT');
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
  await prisma.mealPlan
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.canteenMenu
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.parentStudent
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
  await prisma.student
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: TENANT_A_SLUG } }).catch(() => undefined);
}
