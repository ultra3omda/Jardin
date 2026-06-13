/**
 * G7 — Class promotion e2e : preview (no-op), commit (transaction), graduate
 * (ALUMNI), isolation multi-tenant (R10).
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

const TENANT_A_SLUG = 'g7-promo-a';
const TENANT_B_SLUG = 'g7-promo-b';
const EMAIL_DOMAIN = 'g7-promo-test.fr';
const PASSWORD = 'G7PromoTest1234!';
const FROM_YEAR = '2025-2026';
const TO_YEAR = '2026-2027';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Class promotion (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminA: SeedActor;
  let adminB: SeedActor;
  let srcClassId: string;
  let targetClassId: string;
  let prepaClassId: string;
  let movableStudentId: string;
  let prepaStudentId: string;

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
      data: { id: createId(), name: 'G7 A', slug: TENANT_A_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });
    const tB = await prisma.tenant.create({
      data: { id: createId(), name: 'G7 B', slug: TENANT_B_SLUG, type: TenantType.KINDERGARTEN, locale: Locale.fr },
    });

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    adminA = await seedUser(prisma, app, tA.id, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    adminB = await seedUser(prisma, app, tB.id, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    const src = await prisma.class.create({
      data: { id: createId(), tenantId: tA.id, name: '3ans-A', level: '3ans', schoolYear: FROM_YEAR },
    });
    const target = await prisma.class.create({
      data: { id: createId(), tenantId: tA.id, name: '4ans-A', level: '4ans', schoolYear: TO_YEAR },
    });
    const prepa = await prisma.class.create({
      data: { id: createId(), tenantId: tA.id, name: 'Prépa-Soleil', level: 'prépa', schoolYear: FROM_YEAR },
    });
    srcClassId = src.id;
    targetClassId = target.id;
    prepaClassId = prepa.id;

    const mk = async (classId: string, name: string) => {
      const [firstName, lastName] = name.split(' ');
      const s = await prisma.student.create({
        data: {
          id: createId(), tenantId: tA.id, firstName, lastName,
          dateOfBirth: new Date('2022-10-18'), sex: Sex.F, classroom: 'x', classId,
          parentEmail: `p@${EMAIL_DOMAIN}`,
        },
      });
      return s.id;
    };
    movableStudentId = await mk(srcClassId, 'Move One');
    await mk(srcClassId, 'Move Two');
    prepaStudentId = await mk(prepaClassId, 'Grad Kid');
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('preview ne modifie rien', async () => {
    const before = await prisma.student.findUnique({ where: { id: movableStudentId } });
    const res = await request(app.getHttpServer())
      .post('/api/classes/promote/preview')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ fromYear: FROM_YEAR, toYear: TO_YEAR, mapping: { [srcClassId]: targetClassId } })
      .expect(201);
    expect(res.body.total).toBe(2);
    const after = await prisma.student.findUnique({ where: { id: movableStudentId } });
    expect(after?.classId).toBe(before?.classId);
    expect(after?.classId).toBe(srcClassId);
  });

  it('commit promeut les élèves vers la classe cible + journalise', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/classes/promote/commit')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ fromYear: FROM_YEAR, toYear: TO_YEAR, mapping: { [srcClassId]: targetClassId } })
      .expect(201);
    expect(res.body.promoted).toBe(2);
    expect(res.body.logId).toBeTruthy();
    const moved = await prisma.student.findUnique({ where: { id: movableStudentId } });
    expect(moved?.classId).toBe(targetClassId);
    expect(moved?.classroom).toBe('4ans-A');
  });

  it('GRADUATED marque les élèves ALUMNI (classId null)', async () => {
    await request(app.getHttpServer())
      .post('/api/classes/promote/commit')
      .set('Authorization', `Bearer ${adminA.accessToken}`)
      .send({ fromYear: FROM_YEAR, toYear: TO_YEAR, mapping: { [prepaClassId]: 'GRADUATED' } })
      .expect(201);
    const grad = await prisma.student.findUnique({ where: { id: prepaStudentId } });
    expect(grad?.status).toBe('ALUMNI');
    expect(grad?.classId).toBeNull();
  });

  it('ISOLATION : le tenant B ne promeut pas les classes du tenant A (0 déplacé)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/classes/promote/commit')
      .set('Authorization', `Bearer ${adminB.accessToken}`)
      .send({ fromYear: FROM_YEAR, toYear: TO_YEAR, mapping: { [prepaClassId]: 'GRADUATED' } })
      .expect(201);
    expect(res.body.promoted).toBe(0);
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
  await prisma.classPromotionLog.deleteMany({ where: { tenant: { slug: { in: slugs } } } }).catch(() => undefined);
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
