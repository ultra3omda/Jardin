/**
 * Profile / sessions e2e — full HTTP coverage of /users/me*.
 *
 * Covers PATCH /me, POST /me/password (incl. wrong-current and same-as
 * rejection), GET /me/sessions, DELETE /me/sessions/:id, DELETE /me.
 * ResendService is overridden to avoid hitting the real Resend API.
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

const SUPER_ADMIN_EMAIL = 'profile-super@e2e.test';

describe('Profile + sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;

  const adminPassword = 'OriginalPassword1234!';
  const newPassword = 'NewPassword9876!';
  const tenantPayload = {
    name: 'Profile Tenant',
    slug: `profile-${Date.now().toString(36)}`,
    type: TenantType.PRIMARY_SCHOOL,
  } as const;
  const adminPayload = {
    email: `profile-admin-${Date.now().toString(36)}@profile.test`,
    firstName: 'Pro',
    lastName: 'File',
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

  async function bootstrapAdmin(): Promise<{
    userId: string;
    accessToken: string;
    refreshToken: string;
  }> {
    const inviteToken = await mintInviteToken();
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ inviteToken, tenant: tenantPayload, admin: adminPayload })
      .expect(201);
    await prisma.user.update({
      where: { id: reg.body.user.id },
      data: { emailVerifiedAt: new Date() },
    });
    return {
      userId: reg.body.user.id,
      accessToken: reg.body.accessToken,
      refreshToken: reg.body.refreshToken,
    };
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
          lastName: 'Profile',
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

  describe('PATCH /me', () => {
    it('updates firstName + lastName + locale', async () => {
      const { accessToken } = await bootstrapAdmin();
      const res = await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: 'Updated', lastName: 'Name', locale: 'en' })
        .expect(200);
      expect(res.body.user.firstName).toBe('Updated');
      expect(res.body.user.lastName).toBe('Name');
      expect(res.body.user.locale).toBe('en');
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/me')
        .send({ firstName: 'X' })
        .expect(401);
    });

    it('rejects firstName too short via ValidationPipe', async () => {
      const { accessToken } = await bootstrapAdmin();
      await request(app.getHttpServer())
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: '' })
        .expect(400);
    });
  });

  describe('POST /me/password', () => {
    it('returns 401 CURRENT_PASSWORD_INVALID on wrong current password', async () => {
      const { accessToken } = await bootstrapAdmin();
      const res = await request(app.getHttpServer())
        .post('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'WrongPassword!', newPassword })
        .expect(401);
      expect(res.body.code).toBe('CURRENT_PASSWORD_INVALID');
    });

    it('returns 400 when newPassword equals currentPassword', async () => {
      const { accessToken } = await bootstrapAdmin();
      const res = await request(app.getHttpServer())
        .post('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: adminPassword, newPassword: adminPassword })
        .expect(400);
      expect(res.body.code).toBe('NEW_PASSWORD_SAME_AS_CURRENT');
    });

    it('changes the password + revokes ALL sessions', async () => {
      const { userId, accessToken, refreshToken } = await bootstrapAdmin();

      const secondLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(200);
      const refreshToken2: string = secondLogin.body.refreshToken;

      await request(app.getHttpServer())
        .post('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: adminPassword, newPassword })
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshToken2 })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: newPassword })
        .expect(200);

      const updated = await prisma.user.findUnique({ where: { id: userId } });
      expect(updated?.passwordChangedAt).toBeInstanceOf(Date);
    });
  });

  describe('GET /me/sessions + DELETE /me/sessions/:id', () => {
    it('lists active sessions and revokes one by id', async () => {
      const { accessToken } = await bootstrapAdmin();

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(200);

      const listRes = await request(app.getHttpServer())
        .get('/api/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const sessions: Array<{ id: string; ip: string | null }> = listRes.body;
      expect(sessions.length).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(sessions)).not.toContain('tokenHash');

      const target = sessions[0]!.id;
      await request(app.getHttpServer())
        .delete(`/api/users/me/sessions/${target}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/users/me/sessions/${target}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      const after = await request(app.getHttpServer())
        .get('/api/users/me/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect((after.body as Array<{ id: string }>).map((s) => s.id)).not.toContain(target);
    });

    it("returns 404 when revoking another user's session", async () => {
      const { accessToken } = await bootstrapAdmin();
      const otherEmail = `other-${Date.now().toString(36)}@profile.test`;
      const otherUser = await prisma.user.create({
        data: {
          id: createId(),
          tenantId: null,
          email: otherEmail,
          passwordHash: await bcrypt.hash('SomePassword!1234', 4),
          firstName: 'O',
          lastName: 'T',
          role: UserRole.SUPER_ADMIN,
          emailVerifiedAt: new Date(),
        },
      });
      const otherToken = await prisma.refreshToken.create({
        data: {
          id: createId(),
          userId: otherUser.id,
          tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/users/me/sessions/${otherToken.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      await prisma.refreshToken.delete({ where: { id: otherToken.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('DELETE /me', () => {
    it('soft-deletes the user + revokes all sessions', async () => {
      const { userId, accessToken, refreshToken } = await bootstrapAdmin();

      await request(app.getHttpServer())
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const u = await prisma.user.findUnique({ where: { id: userId } });
      expect(u?.deletedAt).toBeInstanceOf(Date);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminPayload.email, password: adminPassword })
        .expect(401);
    });
  });
});
