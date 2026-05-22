/**
 * Auth e2e — exercises the full HTTP flow against a real Postgres database.
 *
 * Requires: docker compose up -d  (postgres healthy)
 *         + pnpm prisma migrate deploy (schema applied)
 */
import { createHash, randomBytes } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { ResendService } from '../src/common/email/resend.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

const SUPER_ADMIN_FIXTURE_EMAIL = 'super-e2e-test@e2e.test';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;

  const adminPassword = 'TestPassword1234!';
  const tenantPayload = {
    name: 'Acme E2E',
    slug: `acme-e2e-${Date.now().toString(36)}`,
    type: TenantType.KINDERGARTEN,
  } as const;
  const adminPayload = {
    email: `admin-${Date.now().toString(36)}@acme.test`,
    firstName: 'Acme',
    lastName: 'Admin',
    password: adminPassword,
  };

  async function mintInviteToken(invitedEmail?: string | null): Promise<string> {
    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    await prisma.inviteToken.create({
      data: {
        id: createId(),
        tokenHash,
        invitedEmail: invitedEmail?.toLowerCase() ?? null,
        intendedRole: UserRole.SCHOOL_ADMIN,
        createdById: superAdminId,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    return plaintext;
  }

  /** V1.5: marks the just-registered user as email-verified so /login succeeds. */
  async function markEmailVerified(email: string): Promise<void> {
    await prisma.user.updateMany({
      where: { email: email.toLowerCase() },
      data: { emailVerifiedAt: new Date() },
    });
  }

  beforeAll(async () => {
    // V1.5: don't actually send emails on this suite — register triggers a
    // verification mail that we don't care about here. Quota-saver for CI.
    const noopResend = { send: vi.fn().mockResolvedValue({ success: true }) };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
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

    // Idempotent super_admin fixture for minting invite tokens.
    const existing = await prisma.user.findFirst({
      where: { email: SUPER_ADMIN_FIXTURE_EMAIL, role: UserRole.SUPER_ADMIN },
    });
    if (existing) {
      superAdminId = existing.id;
    } else {
      const created = await prisma.user.create({
        data: {
          id: createId(),
          email: SUPER_ADMIN_FIXTURE_EMAIL,
          passwordHash: await bcrypt.hash('e2e-fixture-not-used', 4),
          firstName: 'Super',
          lastName: 'E2E',
          role: UserRole.SUPER_ADMIN,
        },
      });
      superAdminId = created.id;
    }
  });

  afterAll(async () => {
    // Cascades delete the super_admin's invite tokens (FK onDelete: Cascade)
    await prisma.user
      .deleteMany({ where: { email: SUPER_ADMIN_FIXTURE_EMAIL, role: UserRole.SUPER_ADMIN } })
      .catch(() => undefined);
    await app.close();
  });

  beforeEach(async () => {
    // Clean only the rows we touch — keeps seeds + super_admin fixture intact
    await prisma.refreshToken.deleteMany({ where: { user: { email: adminPayload.email.toLowerCase() } } });
    await prisma.auditLog.deleteMany({ where: { user: { email: adminPayload.email.toLowerCase() } } });
    await prisma.user.deleteMany({ where: { email: adminPayload.email.toLowerCase() } });
    await prisma.tenant.deleteMany({ where: { slug: tenantPayload.slug } });
  });

  it('completes a full register → login → me → refresh → logout flow', async () => {
    // Register
    const inviteToken = await mintInviteToken();
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
      .expect(201);

    expect(registerRes.body.accessToken).toBeTypeOf('string');
    expect(registerRes.body.refreshToken).toBeTypeOf('string');
    expect(registerRes.body.tenant.slug).toBe(tenantPayload.slug);
    expect(registerRes.body.user.email).toBe(adminPayload.email.toLowerCase());

    // V1.5: unblock login by flipping emailVerifiedAt directly.
    // (Real flow exercised separately in email-verification.e2e-spec.ts)
    await markEmailVerified(adminPayload.email);

    // Login (with the same credentials, mixed-case email to verify normalization)
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminPayload.email.toUpperCase(), password: adminPassword })
      .expect(200);

    const accessToken: string = loginRes.body.accessToken;
    const refreshToken: string = loginRes.body.refreshToken;
    expect(accessToken).toBeTypeOf('string');
    expect(refreshToken).toBeTypeOf('string');

    // /me
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.user.email).toBe(adminPayload.email.toLowerCase());
    expect(meRes.body.tenant.slug).toBe(tenantPayload.slug);

    // Refresh
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshRes.body.refreshToken).not.toBe(refreshToken);

    // Reusing the OLD refresh token now reports reuse (401) and revokes chain
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    // The newly issued refresh token is also revoked by the chain wipe
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(401);
  });

  it('returns 401 on bad password', async () => {
    const inviteToken = await mintInviteToken();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
      .expect(201);
    await markEmailVerified(adminPayload.email);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminPayload.email, password: 'WrongPassword12345' })
      .expect(401);
  });

  it('returns 400 when slug is already taken', async () => {
    const firstInviteToken = await mintInviteToken();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ inviteToken: firstInviteToken, tenant: tenantPayload, admin: adminPayload })
      .expect(201);

    const secondInviteToken = await mintInviteToken();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        inviteToken: secondInviteToken,
        tenant: tenantPayload,
        admin: { ...adminPayload, email: `other-${Date.now()}@acme.test` },
      })
      .expect(400);
  });

  it('rejects /me without a token (global JWT guard)', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
