/**
 * Tenant white-label branding e2e (V1.6 — D20).
 *
 * Covers:
 *  - GET  /api/public/tenant-brand/:slug (unauth, defaults, 404, Cache-Control)
 *  - GET  /api/admin/tenant/branding (SCHOOL_ADMIN)
 *  - PATCH /api/admin/tenant/branding (hex validation, anti-SSRF)
 *  - DELETE /api/admin/tenant/branding (reset)
 *  - POST /api/admin/tenant/branding/upload-url (mime allowlist)
 *  - Multi-tenant isolation: school A admin CANNOT see/edit school B brand
 */
import { createHash, randomBytes } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { ResendService } from '../src/common/email/resend.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const SUPER_ADMIN_EMAIL = 'branding-super@e2e.test';
const R2_PUBLIC_URL = 'https://assets.ecole-saas.test';

describe('Tenant branding (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminId: string;

  const adminPassword = 'BrandingPass1234!';
  const tenantSlugA = `brand-a-${Date.now().toString(36)}`;
  const tenantSlugB = `brand-b-${Date.now().toString(36)}`;
  const adminEmailA = `admin-a-${Date.now().toString(36)}@brand.test`;
  const adminEmailB = `admin-b-${Date.now().toString(36)}@brand.test`;

  let adminA_token: string;
  let adminB_token: string;

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

  async function bootstrapAdmin(
    slug: string,
    email: string,
  ): Promise<string> {
    const inviteToken = await mintInviteToken();
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        inviteToken,
        tenant: { name: `School ${slug}`, slug, type: TenantType.PRIMARY_SCHOOL },
        admin: { email, firstName: 'Brand', lastName: 'Admin', password: adminPassword },
      })
      .expect(201);
    await prisma.user.update({
      where: { id: reg.body.user.id },
      data: { emailVerifiedAt: new Date() },
    });
    return reg.body.accessToken as string;
  }

  beforeAll(async () => {
    const noopResend = { send: vi.fn().mockResolvedValue({ success: true }) };
    // R2Service mock: returns a deterministic signed URL so we don't need real
    // R2 credentials in test. Anti-SSRF check still uses the real ConfigService
    // (env-loaded), so we set R2_PUBLIC_URL via env before the module loads.
    process.env.R2_PUBLIC_URL = R2_PUBLIC_URL;
    process.env.R2_TENANT_ASSETS_BUCKET = 'ecole-saas-tenant-assets';

    const fakeR2 = {
      isEnabled: () => true,
      signedPutUrl: vi
        .fn()
        .mockImplementation(async (key: string) => `https://upload.test/signed/${key}`),
      signedGetUrl: vi.fn().mockResolvedValue('https://download.test/signed'),
      putBuffer: vi.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ResendService)
      .useValue(noopResend)
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

    // Bootstrap super_admin used to mint invite tokens
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
          lastName: 'Brand',
          role: UserRole.SUPER_ADMIN,
          emailVerifiedAt: new Date(),
        },
      });
      superAdminId = created.id;
    }

    // Bootstrap two tenants + their admins (registered via invite-only flow)
    adminA_token = await bootstrapAdmin(tenantSlugA, adminEmailA);
    adminB_token = await bootstrapAdmin(tenantSlugB, adminEmailB);
  });

  afterAll(async () => {
    for (const slug of [tenantSlugA, tenantSlugB]) {
      const t = await prisma.tenant.findUnique({ where: { slug } });
      if (!t) continue;
      await prisma.refreshToken.deleteMany({ where: { tenantId: t.id } });
      await prisma.auditLog.deleteMany({ where: { tenantId: t.id } });
      await prisma.emailVerificationToken.deleteMany({
        where: { user: { tenantId: t.id } },
      });
      await prisma.passwordResetToken.deleteMany({
        where: { user: { tenantId: t.id } },
      });
      await prisma.user.deleteMany({ where: { tenantId: t.id } });
      await prisma.tenant.delete({ where: { id: t.id } }).catch(() => undefined);
    }
    await prisma.inviteToken.deleteMany({ where: { createdById: superAdminId } });
    await prisma.user
      .deleteMany({ where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN } })
      .catch(() => undefined);
    await app.close();
  });

  describe('GET /api/public/tenant-brand/:slug', () => {
    it('returns DEFAULT_BRAND when never set, with Cache-Control', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/public/tenant-brand/${tenantSlugA}`)
        .expect(200);
      expect(res.body.name).toBe(`School ${tenantSlugA}`);
      expect(res.body.brand.primaryColor).toBe('#4f46e5');
      expect(res.headers['cache-control']).toMatch(/max-age=300/);
    });

    it('returns 404 for unknown slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/public/tenant-brand/definitely-does-not-exist-xyz')
        .expect(404);
      expect(res.body.code).toBe('TENANT_NOT_FOUND');
    });
  });

  describe('GET /api/admin/tenant/branding', () => {
    it('returns DEFAULT_BRAND for a fresh SCHOOL_ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .expect(200);
      expect(res.body.primaryColor).toBe('#4f46e5');
      expect(res.body.logoUrl).toBeNull();
    });

    it('rejects unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/tenant/branding')
        .expect(401);
    });
  });

  describe('PATCH /api/admin/tenant/branding', () => {
    it('accepts valid hex + R2-prefixed logoUrl', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({
          primaryColor: '#ff0000',
          logoUrl: `${R2_PUBLIC_URL}/tenants/x/logo-abc.png`,
        })
        .expect(200);
      expect(res.body.primaryColor).toBe('#ff0000');
      expect(res.body.logoUrl).toBe(`${R2_PUBLIC_URL}/tenants/x/logo-abc.png`);
    });

    it('rejects non-hex primaryColor', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ primaryColor: 'red' })
        .expect(400);
    });

    it('rejects 3-digit hex (#fff)', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ primaryColor: '#fff' })
        .expect(400);
    });

    it('rejects logoUrl outside R2_PUBLIC_URL (anti-SSRF)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ logoUrl: 'https://evil.tld/logo.png' })
        .expect(400);
      expect(res.body.code).toBe('BRAND_URL_NOT_IN_R2');
    });
  });

  describe('POST /api/admin/tenant/branding/upload-url', () => {
    it('returns presigned URL + final URL for image/png', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/tenant/branding/upload-url')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ kind: 'logo', contentType: 'image/png' })
        .expect(200);
      expect(res.body.uploadUrl).toMatch(/^https:\/\/upload\.test\/signed\/tenants\//);
      expect(res.body.finalUrl).toMatch(/^https:\/\/assets\.ecole-saas\.test\/tenants\//);
      expect(res.body.finalUrl).toMatch(/\.png$/);
    });

    it('rejects application/pdf', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/tenant/branding/upload-url')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ kind: 'logo', contentType: 'application/pdf' })
        .expect(400);
      expect(res.body.code).toBe('BRAND_CONTENT_TYPE_FORBIDDEN');
    });

    it('rejects invalid kind', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/tenant/branding/upload-url')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ kind: 'banner', contentType: 'image/png' })
        .expect(400);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('school A PATCH does NOT leak into school B', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ primaryColor: '#abcdef' })
        .expect(200);
      const resB = await request(app.getHttpServer())
        .get('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminB_token}`)
        .expect(200);
      expect(resB.body.primaryColor).toBe('#4f46e5');
    });
  });

  describe('DELETE /api/admin/tenant/branding', () => {
    it('resets to DEFAULT_BRAND', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .send({ primaryColor: '#000000' })
        .expect(200);
      const reset = await request(app.getHttpServer())
        .delete('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .expect(200);
      expect(reset.body.primaryColor).toBe('#4f46e5');
      const after = await request(app.getHttpServer())
        .get('/api/admin/tenant/branding')
        .set('Authorization', `Bearer ${adminA_token}`)
        .expect(200);
      expect(after.body.primaryColor).toBe('#4f46e5');
    });
  });
});
