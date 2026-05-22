/**
 * Email verification e2e — full register → email captured → verify → login flow.
 *
 * The real Resend client is replaced via overrideProvider so the test never
 * makes an outbound HTTP call. The captured verifyUrl is parsed to extract
 * the single-use token which is then sent to /email/verify.
 *
 * Requires the same env as the rest of the e2e suite (DATABASE_URL,
 * JWT_*_SECRET, RESEND_API_KEY, migrations applied).
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
import { ResendService, SendEmailOptions, SendResult } from '../src/common/email/resend.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

const SUPER_ADMIN_EMAIL = 'email-verif-super@e2e.test';

interface CapturedEmail {
  to: string;
  subject: string;
  /** verifyUrl extracted from the template props (template is the JSX element) */
  verifyUrl: string | null;
}

function extractVerifyUrl(template: SendEmailOptions['template']): string | null {
  const props = (template as unknown as { props?: { verifyUrl?: string } }).props;
  return props?.verifyUrl ?? null;
}

describe('Email verification flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;
  let captured: CapturedEmail[];
  const resendMock = {
    send: vi.fn(async (opts: SendEmailOptions): Promise<SendResult> => {
      captured.push({
        to: opts.to,
        subject: opts.subject,
        verifyUrl: extractVerifyUrl(opts.template),
      });
      return { success: true, id: `mocked_${randomBytes(4).toString('hex')}` };
    }),
  };

  const tenantPayload = {
    name: 'Verify Flow Tenant',
    slug: `verify-flow-${Date.now().toString(36)}`,
    type: TenantType.PRIMARY_SCHOOL,
  } as const;
  const adminPassword = 'TestPassword1234!';
  const adminPayload = {
    email: `verify-admin-${Date.now().toString(36)}@verify.test`,
    firstName: 'Veri',
    lastName: 'Fy',
    password: adminPassword,
  };

  async function mintInviteToken(): Promise<string> {
    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    await prisma.inviteToken.create({
      data: {
        id: createId(),
        tokenHash,
        intendedRole: UserRole.SCHOOL_ADMIN,
        createdById: superAdminId,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    return plaintext;
  }

  async function mintRawVerificationToken(opts: {
    userId: string;
    expiresAt?: Date;
    consumedAt?: Date | null;
  }): Promise<string> {
    const plaintext = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(plaintext).digest('hex');
    await prisma.emailVerificationToken.create({
      data: {
        id: createId(),
        userId: opts.userId,
        tokenHash,
        expiresAt: opts.expiresAt ?? new Date(Date.now() + 48 * 3600_000),
        consumedAt: opts.consumedAt ?? null,
      },
    });
    return plaintext;
  }

  beforeAll(async () => {
    captured = [];
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendService)
      .useValue(resendMock)
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
    } else {
      const created = await prisma.user.create({
        data: {
          id: createId(),
          email: SUPER_ADMIN_EMAIL,
          passwordHash: await bcrypt.hash('not-used', 4),
          firstName: 'Super',
          lastName: 'Verif',
          role: UserRole.SUPER_ADMIN,
          emailVerifiedAt: new Date(),
        },
      });
      superAdminId = created.id;
    }
  });

  afterAll(async () => {
    await prisma.user
      .deleteMany({ where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN } })
      .catch(() => undefined);
    await app.close();
  });

  beforeEach(async () => {
    captured.length = 0;
    resendMock.send.mockClear();
    await prisma.refreshToken.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.auditLog.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.user.deleteMany({ where: { email: adminPayload.email.toLowerCase() } });
    await prisma.tenant.deleteMany({ where: { slug: tenantPayload.slug } });
  });

  describe('happy path', () => {
    it('register → captured verifyUrl → /email/verify → login succeeds', async () => {
      const inviteToken = await mintInviteToken();

      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
        .expect(201);

      const loginBlocked = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(403);
      expect(loginBlocked.body.code).toBe('EMAIL_NOT_VERIFIED');

      expect(captured).toHaveLength(1);
      expect(captured[0]!.to).toBe(adminPayload.email.toLowerCase());
      const verifyUrl = captured[0]!.verifyUrl;
      expect(verifyUrl).toMatch(/\/verify-email\?token=[A-Za-z0-9_-]{43}$/);
      const token = new URL(verifyUrl!).searchParams.get('token')!;

      const verifyRes = await request(app.getHttpServer())
        .post('/api/auth/email/verify')
        .send({ token })
        .expect(200);
      expect(verifyRes.body).toMatchObject({
        verified: true,
        userId: registerRes.body.user.id,
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(200);
      expect(loginRes.body.accessToken).toBeTypeOf('string');
    });
  });

  describe('rejection paths', () => {
    it('rejects unknown token with EMAIL_VERIFICATION_TOKEN_UNKNOWN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/email/verify')
        .send({ token: randomBytes(32).toString('base64url') })
        .expect(400);
      expect(res.body.code).toBe('EMAIL_VERIFICATION_TOKEN_UNKNOWN');
    });

    it('rejects already-consumed token', async () => {
      const inviteToken = await mintInviteToken();
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
        .expect(201);
      const userId = reg.body.user.id;

      const plaintext = await mintRawVerificationToken({ userId, consumedAt: new Date() });

      const res = await request(app.getHttpServer())
        .post('/api/auth/email/verify')
        .send({ token: plaintext })
        .expect(400);
      expect(res.body.code).toBe('EMAIL_VERIFICATION_TOKEN_CONSUMED');
    });

    it('rejects expired token', async () => {
      const inviteToken = await mintInviteToken();
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
        .expect(201);
      const userId = reg.body.user.id;

      const plaintext = await mintRawVerificationToken({
        userId,
        expiresAt: new Date(Date.now() - 1_000),
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/email/verify')
        .send({ token: plaintext })
        .expect(400);
      expect(res.body.code).toBe('EMAIL_VERIFICATION_TOKEN_EXPIRED');
    });

    it('rejects /email/verify with bad token shape via ValidationPipe', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/email/verify')
        .send({ token: 'too-short' })
        .expect(400);
    });
  });

  describe('resend', () => {
    it('returns 401 when /email/resend is called without a token', async () => {
      await request(app.getHttpServer()).post('/api/auth/email/resend').expect(401);
    });

    it('triggers a second verification email for an unverified user', async () => {
      const inviteToken = await mintInviteToken();
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
        .expect(201);
      const accessToken = reg.body.accessToken;
      expect(captured).toHaveLength(1);

      await request(app.getHttpServer())
        .post('/api/auth/email/resend')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      expect(captured).toHaveLength(2);
      expect(captured[1]!.to).toBe(adminPayload.email.toLowerCase());
      expect(captured[1]!.verifyUrl).toMatch(/\/verify-email\?token=[A-Za-z0-9_-]{43}$/);
    });

    it('returns 400 EMAIL_ALREADY_VERIFIED when user is already verified', async () => {
      const inviteToken = await mintInviteToken();
      const reg = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
        .expect(201);
      const accessToken = reg.body.accessToken;

      await prisma.user.update({
        where: { id: reg.body.user.id },
        data: { emailVerifiedAt: new Date() },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/email/resend')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
      expect(res.body.code).toBe('EMAIL_ALREADY_VERIFIED');
    });
  });
});
