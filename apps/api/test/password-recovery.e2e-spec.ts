/**
 * Password recovery e2e — full forgot → captured email → reset → all
 * sessions revoked → new password works, old password fails.
 *
 * ResendService is overridden via Test module so the test never makes
 * an outbound HTTP call; the captured resetUrl is parsed to extract the
 * single-use token.
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

const SUPER_ADMIN_EMAIL = 'pwd-recovery-super@e2e.test';

interface CapturedEmail {
  to: string;
  subject: string;
  resetUrl: string | null;
}

function extractResetUrl(template: SendEmailOptions['template']): string | null {
  const props = (template as unknown as { props?: { resetUrl?: string } }).props;
  return props?.resetUrl ?? null;
}

describe('Password recovery flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;
  let captured: CapturedEmail[];
  const resendMock = {
    send: vi.fn(async (opts: SendEmailOptions): Promise<SendResult> => {
      captured.push({
        to: opts.to,
        subject: opts.subject,
        resetUrl: extractResetUrl(opts.template),
      });
      return { success: true, id: `mocked_${randomBytes(4).toString('hex')}` };
    }),
  };

  const tenantPayload = {
    name: 'Pwd Recovery Tenant',
    slug: `pwd-recovery-${Date.now().toString(36)}`,
    type: TenantType.PRIMARY_SCHOOL,
  } as const;
  const adminPassword = 'OriginalPassword1234!';
  const newPassword = 'NewPassword9876!';
  const adminPayload = {
    email: `pwd-admin-${Date.now().toString(36)}@pwd.test`,
    firstName: 'Pass',
    lastName: 'Word',
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

  async function registerAndVerify(): Promise<{ userId: string }> {
    const inviteToken = await mintInviteToken();
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
      .expect(201);
    await prisma.user.update({
      where: { id: reg.body.user.id },
      data: { emailVerifiedAt: new Date() },
    });
    return { userId: reg.body.user.id };
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
          lastName: 'PwdRecovery',
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
    await prisma.passwordResetToken.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.auditLog.deleteMany({
      where: { user: { email: adminPayload.email.toLowerCase() } },
    });
    await prisma.user.deleteMany({ where: { email: adminPayload.email.toLowerCase() } });
    await prisma.tenant.deleteMany({ where: { slug: tenantPayload.slug } });
  });

  describe('/password/forgot — anti-enumeration', () => {
    it('returns 204 + no email when address does not match any account', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: 'never-existed@nowhere.test' })
        .expect(204);
      expect(captured).toHaveLength(0);
    });

    it('returns 204 + sends an email when address matches', async () => {
      await registerAndVerify();
      captured.length = 0;

      await request(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: adminPayload.email })
        .expect(204);

      const resetEmails = captured.filter((c) => c.resetUrl);
      expect(resetEmails).toHaveLength(1);
      expect(resetEmails[0]!.to).toBe(adminPayload.email.toLowerCase());
      // V1.6 — URL pattern is /t/<slug>/reset-password?token=... for tenant
      // users (path-based pre-auth) or /reset-password?token=... for legacy.
      expect(resetEmails[0]!.resetUrl).toMatch(/(\/t\/[a-z0-9-]+)?\/reset-password\?token=[A-Za-z0-9_-]{43}$/);
    });
  });

  describe('/password/reset — happy path', () => {
    it('captures resetUrl → resets password → old login fails, new login succeeds, all sessions revoked', async () => {
      const { userId } = await registerAndVerify();

      const firstLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(200);
      const oldRefreshToken: string = firstLogin.body.refreshToken;

      captured.length = 0;
      await request(app.getHttpServer())
        .post('/api/auth/password/forgot')
        .send({ email: adminPayload.email })
        .expect(204);
      const url = captured.find((c) => c.resetUrl)?.resetUrl;
      expect(url).toBeTruthy();
      const token = new URL(url!).searchParams.get('token')!;

      const resetRes = await request(app.getHttpServer())
        .post('/api/auth/password/reset')
        .send({ token, newPassword })
        .expect(200);
      expect(resetRes.body).toMatchObject({ success: true, userId });

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: newPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      const updated = await prisma.user.findUnique({ where: { id: userId } });
      expect(updated?.passwordChangedAt).toBeInstanceOf(Date);
    });
  });

  describe('/password/reset — rejection paths', () => {
    it('rejects unknown token with PASSWORD_RESET_TOKEN_UNKNOWN', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/password/reset')
        .send({ token: randomBytes(32).toString('base64url'), newPassword })
        .expect(400);
      expect(res.body.code).toBe('PASSWORD_RESET_TOKEN_UNKNOWN');
    });

    it('rejects consumed token with PASSWORD_RESET_TOKEN_CONSUMED', async () => {
      const { userId } = await registerAndVerify();
      const plaintext = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(plaintext).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          id: createId(),
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600_000),
          consumedAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/password/reset')
        .send({ token: plaintext, newPassword })
        .expect(400);
      expect(res.body.code).toBe('PASSWORD_RESET_TOKEN_CONSUMED');
    });

    it('rejects expired token with PASSWORD_RESET_TOKEN_EXPIRED', async () => {
      const { userId } = await registerAndVerify();
      const plaintext = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(plaintext).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          id: createId(),
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() - 1_000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/password/reset')
        .send({ token: plaintext, newPassword })
        .expect(400);
      expect(res.body.code).toBe('PASSWORD_RESET_TOKEN_EXPIRED');
    });

    it('rejects newPassword shorter than 12 chars via ValidationPipe', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/password/reset')
        .send({ token: randomBytes(32).toString('base64url'), newPassword: 'short' })
        .expect(400);
    });
  });
});
