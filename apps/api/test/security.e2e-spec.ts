/**
 * T2b PR-4 — Sécurité e2e: RBAC + persistence (school-level, admin/staff only).
 *
 * Couvre (tenant A) les 3 ressources /security-incidents, /visitor-logs, /safety-drills :
 *  - POST STAFF → 201 ; TEACHER → 403 ; PARENT → 403.
 *  - GET PARENT → 403 ; GET TEACHER → 403 (niveau école, admin/staff uniquement).
 *  - POST /security-incidents/:id/resolve STAFF → 201 (status RESOLVED).
 *  - Persistance : incident créé en STAFF visible dans la liste ADMIN.
 *
 * Bootstrap identique aux autres e2e (mirror canteen.e2e-spec.ts).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const TENANT_A_SLUG = 't2b-security-a';
const EMAIL_DOMAIN = 't2b-security-test.fr';
const PASSWORD = 'T2bSecurityTest1234!';

interface SeedActor {
  id: string;
  email: string;
  accessToken: string;
}

describe('Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let schoolAdminA: SeedActor;
  let staffA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;

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
        name: 'T2b Security A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;

    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    staffA = await seedUser(prisma, app, tenantAId, UserRole.STAFF, 'staff-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
    parentA = await seedUser(prisma, app, tenantAId, UserRole.PARENT, 'parent-a', pwHash);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  // ─── security-incidents ─────────────────────────────────────────────────────

  it('STAFF creates an incident (201); TEACHER → 403; PARENT → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/security-incidents')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ type: 'INTRUSION', occurredAt: '2026-05-23T10:30:00.000Z', description: 'Intrus' })
      .expect(201);
    expect(res.body.status).toBe('OPEN');

    await request(app.getHttpServer())
      .post('/api/security-incidents')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ type: 'OTHER', occurredAt: '2026-05-23T10:30:00.000Z', description: 'X' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/security-incidents')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ type: 'OTHER', occurredAt: '2026-05-23T10:30:00.000Z', description: 'X' })
      .expect(403);
  });

  it('PARENT and TEACHER cannot read security incidents (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/security-incidents')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/security-incidents')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .expect(403);
  });

  it('STAFF resolves an incident (status RESOLVED) and it persists in the admin list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/security-incidents')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ type: 'THEFT', occurredAt: '2026-05-24T09:00:00.000Z', description: 'Vol signalé' })
      .expect(201);
    const id = created.body.id as string;

    const resolved = await request(app.getHttpServer())
      .post(`/api/security-incidents/${id}/resolve`)
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ resolutionNote: 'Objet retrouvé.' })
      .expect(201);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(resolved.body.resolvedById).toBe(staffA.id);

    const list = await request(app.getHttpServer())
      .get('/api/security-incidents')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    expect((list.body.items as Array<{ id: string }>).map((e) => e.id)).toContain(id);
  });

  // ─── visitor-logs + safety-drills ───────────────────────────────────────────

  it('STAFF records a visitor (201); PARENT → 403', async () => {
    await request(app.getHttpServer())
      .post('/api/visitor-logs')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({ visitorName: 'M. Gharbi', checkInAt: '2026-05-23T08:15:00.000Z' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/visitor-logs')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({ visitorName: 'X', checkInAt: '2026-05-23T08:15:00.000Z' })
      .expect(403);
  });

  it('SCHOOL_ADMIN records a safety drill (201); TEACHER → 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/safety-drills')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ type: 'FIRE', conductedAt: '2026-05-22T11:00:00.000Z', durationMin: 15 })
      .expect(201);
    expect(res.body.type).toBe('FIRE');

    await request(app.getHttpServer())
      .post('/api/safety-drills')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ type: 'LOCKDOWN', conductedAt: '2026-05-22T11:00:00.000Z' })
      .expect(403);
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
  await prisma.securityIncident
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.visitorLog
    .deleteMany({ where: { tenant: { slug: TENANT_A_SLUG } } })
    .catch(() => undefined);
  await prisma.safetyDrill
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
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: TENANT_A_SLUG } }).catch(() => undefined);
}
