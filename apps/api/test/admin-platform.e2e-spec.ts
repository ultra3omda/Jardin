/**
 * T2d — Admin platform e2e:
 *   RBAC matrix (SUPER_ADMIN 200 / SCHOOL_ADMIN 403) on every new
 *   cross-tenant read route, plus demo-status persistence round-trip.
 *
 * Requires the same env as the rest of the e2e suite (DATABASE_URL,
 * JWT_*_SECRET, migrations applied). Resend is overridden with a no-op
 * mock so no real email is sent. Login requires a verified email
 * (auth.service throws EMAIL_NOT_VERIFIED otherwise), hence both seeded
 * users get emailVerifiedAt.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { ResendService } from '../src/common/email/resend.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

const PREFIX = 't2de2e-';
const EMAIL_DOMAIN = 't2de2e.test';
// Throwaway credential generated at runtime (no hardcoded secret): used only to
// seed + log in ephemeral test users in the CI test database. Grants no access
// to any real account. A random cuid satisfies the login DTO (IsString/MinLength).
const PASSWORD = createId();
const SEED_REQUEST_ID = 'dr_t2de2e_1';

describe('Admin platform (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superToken: string;
  let schoolAdminToken: string;
  let tenantId: string;

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    const noopResend = { send: vi.fn().mockResolvedValue({ success: true }) };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendService)
      .useValue(noopResend)
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

    await cleanup();
    const passwordHash = await bcrypt.hash(PASSWORD, 4);

    const tenant = await prisma.tenant.create({
      data: { id: createId(), slug: `${PREFIX}school`, name: `${PREFIX}School`, type: 'PRIMARY_SCHOOL', locale: 'fr' },
    });
    tenantId = tenant.id;

    await prisma.user.create({
      data: {
        id: createId(),
        tenantId: null,
        email: `super@${EMAIL_DOMAIN}`,
        firstName: 'Super',
        lastName: 'T2d',
        role: UserRole.SUPER_ADMIN,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    await prisma.user.create({
      data: {
        id: createId(),
        tenantId,
        email: `admin@${EMAIL_DOMAIN}`,
        firstName: 'Admin',
        lastName: 'T2d',
        role: UserRole.SCHOOL_ADMIN,
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        id: createId(),
        action: 'demo.requested',
        resource: 'public',
        tenantId: null,
        userId: null,
        metadata: {
          requestId: SEED_REQUEST_ID,
          email: `prospect@${EMAIL_DOMAIN}`,
          schoolName: `${PREFIX}Prospect`,
          studentsCount: 100,
          locale: 'fr',
        },
        ip: '127.0.0.1',
        userAgent: 'vitest',
      },
    });

    superToken = await login(`super@${EMAIL_DOMAIN}`);
    schoolAdminToken = await login(`admin@${EMAIL_DOMAIN}`);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function cleanup(): Promise<void> {
    await prisma.auditLog
      .deleteMany({ where: { metadata: { path: ['requestId'], equals: SEED_REQUEST_ID } } })
      .catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } }).catch(() => undefined);
    await prisma.tenant.deleteMany({ where: { slug: { startsWith: PREFIX } } }).catch(() => undefined);
  }

  const protectedGets = ['/api/admin/audit', '/api/admin/overview', '/api/admin/analytics', '/api/admin/demo-requests'];

  it.each(protectedGets)('SUPER_ADMIN gets 200 on %s', async (path) => {
    await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${superToken}`).expect(200);
  });

  it.each(protectedGets)('SCHOOL_ADMIN gets 403 on %s', async (path) => {
    await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${schoolAdminToken}`).expect(403);
  });

  it('SUPER_ADMIN can update a demo request status and it persists', async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/demo-requests/${SEED_REQUEST_ID}/status`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ status: 'SCHEDULED', note: 'e2e' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('SCHEDULED');
        expect(res.body.requestId).toBe(SEED_REQUEST_ID);
      });

    const after = await request(app.getHttpServer())
      .get('/api/admin/demo-requests')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    const record = (after.body as Array<{ requestId: string; status: string }>).find(
      (r) => r.requestId === SEED_REQUEST_ID,
    );
    expect(record?.status).toBe('SCHEDULED');
  });

  it('SCHOOL_ADMIN gets 403 when patching a demo status', async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/demo-requests/${SEED_REQUEST_ID}/status`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({ status: 'DONE' })
      .expect(403);
  });
});
