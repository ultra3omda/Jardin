/**
 * Invite-only register flow e2e — full HTTP-level coverage:
 *   super_admin login → mint invite → register-with-token success
 *   + each invite rejection code (UNKNOWN/CONSUMED/EXPIRED/EMAIL_MISMATCH)
 *   + role-based 403 when non-super_admin tries to mint
 *
 * Requires the same env as the rest of the e2e suite (DATABASE_URL,
 * JWT_*_SECRET, migrations applied).
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

const SUPER_ADMIN_EMAIL = 'invite-flow-super@e2e.test';
const SUPER_ADMIN_PASSWORD = 'SuperE2EPassword1234!';

describe('Invite-only register flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;
  let superAdminAccessToken: string;

  const adminPassword = 'TestPassword1234!';
  const tenantPayload = {
    name: 'Invite Flow Tenant',
    slug: `invite-flow-${Date.now().toString(36)}`,
    type: TenantType.PRIMARY_SCHOOL,
  } as const;
  const adminPayload = {
    email: `invite-admin-${Date.now().toString(36)}@invite.test`,
    firstName: 'Inv',
    lastName: 'Ite',
    password: adminPassword,
  };

  async function mintRawToken(opts: {
    invitedEmail?: string | null;
    expiresAt?: Date;
    intendedRole?: UserRole;
    consumedAt?: Date | null;
  } = {}): Promise<{ id: string; plaintext: string }> {
    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    const id = createId();
    await prisma.inviteToken.create({
      data: {
        id,
        tokenHash,
        invitedEmail: opts.invitedEmail?.toLowerCase() ?? null,
        intendedRole: opts.intendedRole ?? UserRole.SCHOOL_ADMIN,
        createdById: superAdminId,
        expiresAt: opts.expiresAt ?? new Date(Date.now() + 86_400_000),
        consumedAt: opts.consumedAt ?? null,
      },
    });
    return { id, plaintext };
  }

  beforeAll(async () => {
    // V1.5: no-op Resend so register's verification email doesn't hit prod.
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

    const existing = await prisma.user.findFirst({
      where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN },
    });
    if (existing) {
      superAdminId = existing.id;
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      const created = await prisma.user.create({
        data: {
          id: createId(),
          email: SUPER_ADMIN_EMAIL,
          passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
          firstName: 'Super',
          lastName: 'Invite',
          role: UserRole.SUPER_ADMIN,
          emailVerifiedAt: new Date(),
        },
      });
      superAdminId = created.id;
    }

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
      .expect(200);
    superAdminAccessToken = loginRes.body.accessToken;
    expect(superAdminAccessToken).toBeTypeOf('string');
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({ where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN } })
      .catch(() => undefined);
    await app.close();
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.auditLog.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.user.deleteMany({ where: { email: adminPayload.email.toLowerCase() } });
    await prisma.tenant.deleteMany({ where: { slug: tenantPayload.slug } });
  });

  describe('happy path', () => {
    it('mint via /admin/invite-tokens → consume via /register → token marked consumed', async () => {
      const mintRes = await request(app.getHttpServer())
        .post('/api/admin/invite-tokens')
        .set('Authorization', `Bearer ${superAdminAccessToken}`)
        .send({ invitedEmail: adminPayload.email, expiresInDays: 7 })
        .expect(201);

      expect(mintRes.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(mintRes.body.url).toContain(`/register?token=${mintRes.body.token}`);
      expect(mintRes.body.invitedEmail).toBe(adminPayload.email.toLowerCase());

      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          inviteToken: mintRes.body.token,
          tenant: tenantPayload,
          admin: adminPayload,
        })
        .expect(201);

      expect(registerRes.body.user.email).toBe(adminPayload.email.toLowerCase());
      expect(registerRes.body.tenant.slug).toBe(tenantPayload.slug);

      const after = await prisma.inviteToken.findUnique({ where: { id: mintRes.body.id } });
      expect(after?.consumedAt).toBeInstanceOf(Date);
      expect(after?.consumedByUserId).toBe(registerRes.body.user.id);
    });
  });

  describe('email verification gate (V1.6 auto-verify)', () => {
    it('email-bound invite → admin auto-verified → immediate re-login succeeds', async () => {
      const mintRes = await request(app.getHttpServer())
        .post('/api/admin/invite-tokens')
        .set('Authorization', `Bearer ${superAdminAccessToken}`)
        .send({ invitedEmail: adminPayload.email, expiresInDays: 7 })
        .expect(201);

      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken: mintRes.body.token, tenant: tenantPayload, admin: adminPayload })
        .expect(201);

      // DB: the email is marked verified at registration time.
      const created = await prisma.user.findUnique({
        where: { id: registerRes.body.user.id },
      });
      expect(created?.emailVerifiedAt).toBeInstanceOf(Date);

      // A subsequent login is NOT blocked by the EMAIL_NOT_VERIFIED gate.
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminPayload.email,
          password: adminPassword,
          tenantSlug: tenantPayload.slug,
        })
        .expect(200);
      expect(loginRes.body.accessToken).toBeTypeOf('string');
    });

    it('open (email-less) invite → admin stays unverified → re-login is gated', async () => {
      const { plaintext } = await mintRawToken({ invitedEmail: null });

      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken: plaintext, tenant: tenantPayload, admin: adminPayload })
        .expect(201);

      // DB: the email is NOT verified — the typed-in address was never vetted.
      const created = await prisma.user.findUnique({
        where: { id: registerRes.body.user.id },
      });
      expect(created?.emailVerifiedAt).toBeNull();

      // A subsequent login is blocked until the email is confirmed.
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminPayload.email,
          password: adminPassword,
          tenantSlug: tenantPayload.slug,
        })
        .expect(403);
      expect(loginRes.body.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('rejection paths', () => {
    it('rejects /register when inviteToken is missing (ValidationPipe 400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ tenant: tenantPayload, admin: adminPayload })
        .expect(400);
    });

    it('rejects unknown invite token with INVITE_TOKEN_UNKNOWN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          inviteToken: randomBytes(32).toString('base64url'),
          tenant: tenantPayload,
          admin: adminPayload,
        })
        .expect(400);
      expect(res.body.code).toBe('INVITE_TOKEN_UNKNOWN');
    });

    it('rejects already-consumed token with INVITE_TOKEN_CONSUMED', async () => {
      const { plaintext } = await mintRawToken({ consumedAt: new Date() });
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken: plaintext, tenant: tenantPayload, admin: adminPayload })
        .expect(400);
      expect(res.body.code).toBe('INVITE_TOKEN_CONSUMED');
    });

    it('rejects expired token with INVITE_TOKEN_EXPIRED', async () => {
      const { plaintext } = await mintRawToken({ expiresAt: new Date(Date.now() - 1_000) });
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken: plaintext, tenant: tenantPayload, admin: adminPayload })
        .expect(400);
      expect(res.body.code).toBe('INVITE_TOKEN_EXPIRED');
    });

    it('rejects mismatched email with INVITE_EMAIL_MISMATCH', async () => {
      const { plaintext } = await mintRawToken({ invitedEmail: 'pinned@example.test' });
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          inviteToken: plaintext,
          tenant: tenantPayload,
          admin: { ...adminPayload, email: 'different@example.test' },
        })
        .expect(400);
      expect(res.body.code).toBe('INVITE_EMAIL_MISMATCH');
    });

    it('rejects non-SCHOOL_ADMIN intendedRole with INVITE_ROLE_NOT_SUPPORTED_FOR_REGISTER', async () => {
      const { plaintext } = await mintRawToken({ intendedRole: UserRole.TEACHER });
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken: plaintext, tenant: tenantPayload, admin: adminPayload })
        .expect(400);
      expect(res.body.code).toBe('INVITE_ROLE_NOT_SUPPORTED_FOR_REGISTER');
    });
  });

  describe('authorization', () => {
    it('returns 401 when /admin/invite-tokens is called without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/invite-tokens')
        .send({})
        .expect(401);
    });

    it('returns 403 when a non-SUPER_ADMIN tries to mint an invite', async () => {
      const { plaintext } = await mintRawToken();
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken: plaintext, tenant: tenantPayload, admin: adminPayload })
        .expect(201);
      const schoolAdminToken = registerRes.body.accessToken;

      await request(app.getHttpServer())
        .post('/api/admin/invite-tokens')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({})
        .expect(403);
    });
  });
});
