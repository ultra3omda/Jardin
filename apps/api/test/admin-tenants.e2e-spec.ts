/**
 * V1.8 — Admin Tenants e2e:
 *   super_admin can create a tenant + invite admin, list returns it,
 *   reserved slug is rejected (400 SLUG_RESERVED),
 *   duplicate slug is rejected (409 SLUG_TAKEN).
 *
 * Requires the same env as the rest of the e2e suite (DATABASE_URL,
 * JWT_*_SECRET, migrations applied). Resend is overridden with a no-op
 * mock so no real email is sent.
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

const SUPER_ADMIN_EMAIL = 'admin-tenants-super@e2e.test';
const SUPER_ADMIN_PASSWORD = 'SuperE2EPassword1234!';

const TEST_EMAIL_DOMAIN = 'v18-test.fr';
const SLUG_PREFIX = 'v18-';

describe('Admin Tenants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminAccessToken: string;

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

    // Clean any leftovers from previous failed runs before setting up.
    await cleanupV18Data(prisma);

    const existing = await prisma.user.findFirst({
      where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN },
    });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          id: createId(),
          email: SUPER_ADMIN_EMAIL,
          passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
          firstName: 'Super',
          lastName: 'AdminTenants',
          role: UserRole.SUPER_ADMIN,
          emailVerifiedAt: new Date(),
        },
      });
    }

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
      .expect(200);
    superAdminAccessToken = loginRes.body.accessToken;
    expect(superAdminAccessToken).toBeTypeOf('string');
  });

  afterAll(async () => {
    await cleanupV18Data(prisma);
    await prisma.user
      .deleteMany({ where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN } })
      .catch(() => undefined);
    await app.close();
  });

  it('SUPER_ADMIN can create a tenant + invite', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        name: 'École Test V1.8',
        slug: 'v18-alpha',
        type: 'PRIMARY_SCHOOL',
        adminEmail: `admin@${TEST_EMAIL_DOMAIN}`,
        adminFirstName: 'Jean',
        adminLastName: 'Test',
        primaryColor: '#ff6600',
        sendInviteEmail: false,
      })
      .expect(201);

    expect(res.body.tenant.slug).toBe('v18-alpha');
    expect(res.body.tenant.brand?.primaryColor).toBe('#ff6600');
    expect(res.body.tenant.usersCount).toBe(1);
    expect(res.body.tenant.adminOnboarded).toBe(false);
    expect(res.body.tenant.inviteStatus).toBe('pending');
    expect(res.body.invite.url).toMatch(/\/register\?token=/);
    expect(res.body.inviteEmailSent).toBe(false);

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'v18-alpha' } });
    expect(tenant).not.toBeNull();
    const admin = await prisma.user.findFirst({ where: { tenantId: tenant!.id } });
    expect(admin?.email).toBe(`admin@${TEST_EMAIL_DOMAIN}`);
    expect(admin?.role).toBe(UserRole.SCHOOL_ADMIN);
  });

  it('rejects a reserved slug with SLUG_RESERVED (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        name: 'WWW Reserved',
        slug: 'www',
        type: 'PRIMARY_SCHOOL',
        adminEmail: `reserved@${TEST_EMAIL_DOMAIN}`,
        adminFirstName: 'A',
        adminLastName: 'B',
        sendInviteEmail: false,
      })
      .expect(400);
    expect(res.body.code).toBe('SLUG_RESERVED');
  });

  it('rejects a duplicate slug with SLUG_TAKEN (409)', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        name: 'École Test V1.8 Beta',
        slug: 'v18-beta',
        type: 'PRIMARY_SCHOOL',
        adminEmail: `beta@${TEST_EMAIL_DOMAIN}`,
        adminFirstName: 'A',
        adminLastName: 'B',
        sendInviteEmail: false,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        name: 'Duplicate',
        slug: 'v18-beta',
        type: 'PRIMARY_SCHOOL',
        adminEmail: `beta2@${TEST_EMAIL_DOMAIN}`,
        adminFirstName: 'A',
        adminLastName: 'B',
        sendInviteEmail: false,
      })
      .expect(409);
    expect(res.body.code).toBe('SLUG_TAKEN');
  });

  it('GET /admin/tenants lists includes the created ones', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .expect(200);
    const slugs = (res.body as Array<{ slug: string }>).map((t) => t.slug);
    expect(slugs).toContain('v18-alpha');
    expect(slugs).toContain('v18-beta');
  });
});

/**
 * Removes any tenant/user/invite/refresh-token leftovers from previous
 * runs of this suite. Idempotent — safe to call before & after.
 */
async function cleanupV18Data(prisma: PrismaService): Promise<void> {
  await prisma.refreshToken
    .deleteMany({
      where: { user: { tenant: { slug: { startsWith: SLUG_PREFIX } } } },
    })
    .catch(() => undefined);
  await prisma.inviteToken
    .deleteMany({ where: { invitedEmail: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [
          { user: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } },
          { tenant: { slug: { startsWith: SLUG_PREFIX } } },
        ],
      },
    })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${TEST_EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { tenant: { slug: { startsWith: SLUG_PREFIX } } } })
    .catch(() => undefined);
  await prisma.tenant
    .deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } })
    .catch(() => undefined);
}
