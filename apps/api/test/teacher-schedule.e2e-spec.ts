/**
 * Teacher schedule e2e: each teacher sees ONLY their own timetable.
 *
 * GET /classes/my-schedule returns the caller's TimeSlots (across all classes),
 * never another teacher's. PARENT is forbidden (403). Anonymous is 401.
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

const SLUG = 'sched-e2e';
const DOMAIN = 'sched-e2e.test';
const PASSWORD = 'SchedE2EPass1234!';

describe('Teacher schedule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA = '';
  let tokenB = '';
  let parentToken = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    prisma = moduleRef.get(PrismaService);

    await cleanup(prisma);

    const tenant = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'Sched E2E',
        slug: SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
        status: 'ACTIVE',
        onboardingCompletedAt: new Date(),
      },
    });
    const pw = await bcrypt.hash(PASSWORD, 4);
    const mk = (email: string, role: UserRole) =>
      prisma.user.create({
        data: {
          id: createId(),
          tenantId: tenant.id,
          email,
          passwordHash: pw,
          firstName: 'X',
          lastName: 'Y',
          role,
          emailVerifiedAt: new Date(),
        },
      });
    const teacherA = await mk(`ta@${DOMAIN}`, UserRole.TEACHER);
    const teacherB = await mk(`tb@${DOMAIN}`, UserRole.TEACHER);
    await mk(`admin@${DOMAIN}`, UserRole.SCHOOL_ADMIN);
    await mk(`parent@${DOMAIN}`, UserRole.PARENT);

    const cls = await prisma.class.create({
      data: { id: createId(), tenantId: tenant.id, name: 'CP-A', level: 'CP', schoolYear: '2025-2026' },
    });

    // Two slots for teacher A, one for teacher B.
    await prisma.timeSlot.createMany({
      data: [
        { id: createId(), tenantId: tenant.id, classId: cls.id, teacherUserId: teacherA.id, dayOfWeek: 1, periodStart: '08:30', periodEnd: '10:00', subject: 'Maths' },
        { id: createId(), tenantId: tenant.id, classId: cls.id, teacherUserId: teacherA.id, dayOfWeek: 2, periodStart: '08:30', periodEnd: '10:00', subject: 'Français' },
        { id: createId(), tenantId: tenant.id, classId: cls.id, teacherUserId: teacherB.id, dayOfWeek: 3, periodStart: '10:15', periodEnd: '11:45', subject: 'Sport' },
      ],
    });

    const login = async (email: string): Promise<string> => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      return res.body.accessToken;
    };
    tokenA = await login(`ta@${DOMAIN}`);
    tokenB = await login(`tb@${DOMAIN}`);
    parentToken = await login(`parent@${DOMAIN}`);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('teacher A sees only their own 2 slots', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes/my-schedule')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(res.body.total).toBe(2);
    const subjects = (res.body.items as Array<{ subject: string; className: string }>).map((s) => s.subject).sort();
    expect(subjects).toEqual(['Français', 'Maths']);
    expect(res.body.items.every((s: { className: string }) => s.className === 'CP-A')).toBe(true);
  });

  it('teacher B sees only their own 1 slot (no leakage from A)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/classes/my-schedule')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].subject).toBe('Sport');
  });

  it('PARENT is forbidden (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/classes/my-schedule')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
  });

  it('anonymous is unauthorized (401)', async () => {
    await request(app.getHttpServer()).get('/api/classes/my-schedule').expect(401);
  });
});

async function cleanup(prisma: PrismaService): Promise<void> {
  await prisma.timeSlot.deleteMany({ where: { tenant: { slug: SLUG } } }).catch(() => undefined);
  await prisma.class.deleteMany({ where: { tenant: { slug: SLUG } } }).catch(() => undefined);
  await prisma.refreshToken
    .deleteMany({ where: { user: { email: { endsWith: `@${DOMAIN}` } } } })
    .catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } }).catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: SLUG } }).catch(() => undefined);
}
