/**
 * G4 — Canteen reservation e2e : catalogue plats, réservation idempotente,
 * réservation de classe, RBAC parent (ses enfants) + isolation multi-tenant (R10).
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

const TENANT_A_SLUG = 'g4-canteen-a';
const TENANT_B_SLUG = 'g4-canteen-b';
const EMAIL_DOMAIN = 'g4-canteen-test.fr';
const PASSWORD = 'G4CanteenTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Canteen reservation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminA: SeedActor;
  let parentA: SeedActor;
  let adminB: SeedActor;
  let classAId: string;
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
      data: { id: createId(), name: 'G4 A', slug: TENANT_A_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });
    const tB = await prisma.tenant.create({
      data: { id: createId(), name: 'G4 B', slug: TENANT_B_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    adminA = await seedUser(prisma, app, tA.id, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    parentA = await seedUser(prisma, app, tA.id, UserRole.PARENT, 'parent-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    const classA = await prisma.class.create({
      data: { id: createId(), tenantId: tA.id, name: '3ans-Poussins', level: '3ans', schoolYear: '2025-2026' },
    });
    classAId = classA.id;

    const owned = await prisma.student.create({
      data: {
        id: createId(), tenantId: tA.id, firstName: 'Owned', lastName: 'Kid',
        dateOfBirth: new Date('2022-10-18'), sex: Sex.F, classroom: classA.name, classId: classA.id,
        parentEmail: parentA.email,
      },
    });
    const other = await prisma.student.create({
      data: {
        id: createId(), tenantId: tA.id, firstName: 'Other', lastName: 'Kid',
        dateOfBirth: new Date('2022-05-10'), sex: Sex.M, classroom: classA.name, classId: classA.id,
        parentEmail: `x@${EMAIL_DOMAIN}`,
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

  it('ADMIN crée un plat au catalogue (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/canteen/dishes')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ name: 'Couscous', ingredients: ['semoule', 'légumes'], allergens: ['gluten'] })
      .expect(201);
    expect(res.body.name).toBe('Couscous');
  });

  it('réserve un repas de façon idempotente', async () => {
    const date = '2026-02-10';
    const r1 = await request(app.getHttpServer())
      .post('/api/canteen/reservations')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ studentId: studentOwned, date })
      .expect(201);
    const r2 = await request(app.getHttpServer())
      .post('/api/canteen/reservations')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ studentId: studentOwned, date })
      .expect(201);
    expect(r1.body.id).toBe(r2.body.id);
  });

  it('réserve une classe entière', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/canteen/reservations/class')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ classId: classAId, date: '2026-02-11' })
      .expect(201);
    expect(res.body.created).toBe(2);
  });

  it('PARENT réserve pour son enfant (201) mais pas pour un autre (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/canteen/reservations')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOwned, date: '2026-02-12' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/canteen/reservations')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ studentId: studentOther, date: '2026-02-12' })
      .expect(403);
  });

  it('ISOLATION : le tenant B ne voit pas les réservations du tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/canteen/reservations?date=2026-02-10')
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
  await prisma.canteenReservation.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.dish.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.parentStudent.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.student.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
  await prisma.class.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
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
