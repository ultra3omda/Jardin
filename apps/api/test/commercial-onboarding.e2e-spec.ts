/**
 * GTM — Commercial pipeline + blocking onboarding (e2e).
 *
 * Covers the full flow:
 *   SUPER_ADMIN creates a COMMERCIAL → commercial creates a signed org
 *   (tenant PENDING_ONBOARDING + contract + tenant-bound invite) → the invited
 *   admin registers and is ATTACHED to that org (no new tenant) → the org is
 *   still PENDING so onboarding is required → admin completes the wizard →
 *   tenant flips to ACTIVE and /auth/me reports onboardingCompleted = true.
 *
 * Also asserts the isolation boundaries: a COMMERCIAL cannot reach the Klasso
 * platform console, and a SCHOOL_ADMIN cannot manage commercials.
 *
 * Resend is mocked (no real email). Requires the standard e2e env.
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

const SUPER_EMAIL = 'gtm-super@gtm-test.fr';
const SUPER_PASSWORD = 'SuperGtmPassword1234!';
const DOMAIN = 'gtm-test.fr';
const SLUG_PREFIX = 'gtm-';

function tokenFromInviteUrl(url: string): string {
  return new URL(url).searchParams.get('token') ?? '';
}

describe('Commercial pipeline + onboarding (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superToken: string;
  let commercialToken: string;
  let orgId: string;

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

    await cleanup(prisma);

    await prisma.user.create({
      data: {
        id: createId(),
        email: SUPER_EMAIL,
        passwordHash: await bcrypt.hash(SUPER_PASSWORD, 4),
        firstName: 'Super',
        lastName: 'Gtm',
        role: UserRole.SUPER_ADMIN,
        emailVerifiedAt: new Date(),
      },
    });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: SUPER_EMAIL, password: SUPER_PASSWORD })
      .expect(200);
    superToken = login.body.accessToken;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('SUPER_ADMIN creates a COMMERCIAL sub-admin, who can log in', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/commercial/agents')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        email: `commercial@${DOMAIN}`,
        firstName: 'Sami',
        lastName: 'Commercial',
        password: 'CommercialPass1234!',
      })
      .expect(201);
    expect(res.body.email).toBe(`commercial@${DOMAIN}`);

    const created = await prisma.user.findFirst({ where: { email: `commercial@${DOMAIN}` } });
    expect(created?.role).toBe(UserRole.COMMERCIAL);
    expect(created?.tenantId).toBeNull();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `commercial@${DOMAIN}`, password: 'CommercialPass1234!' })
      .expect(200);
    commercialToken = login.body.accessToken;
    expect(login.body.user.role).toBe('COMMERCIAL');
    expect(login.body.tenant).toBeNull();
  });

  it('a SCHOOL_ADMIN-bound register attaches to the existing org and stays PENDING', async () => {
    // Commercial creates the signed organization (fake contract fileKey).
    const orgRes = await request(app.getHttpServer())
      .post('/api/commercial/organizations')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send({
        name: 'GTM École Avenir',
        slug: `${SLUG_PREFIX}avenir`,
        type: 'PRIMARY_SCHOOL',
        adminEmail: `dir@${DOMAIN}`,
        adminFirstName: 'Dalila',
        adminLastName: 'Directrice',
        contract: {
          reference: 'KL-GTM-1',
          fileKey: 'contracts/gtm-test.pdf',
          fileName: 'contrat.pdf',
          signedAt: '2026-05-20',
          startDate: '2026-06-01',
          endDate: '2027-06-01',
        },
        sendInviteEmail: false,
      })
      .expect(201);

    expect(orgRes.body.organization.status).toBe('PENDING_ONBOARDING');
    expect(orgRes.body.organization.onboardingCompleted).toBe(false);
    expect(orgRes.body.organization.contractsCount).toBe(1);
    const inviteUrl: string = orgRes.body.invite.url;
    expect(inviteUrl).toMatch(/\/register\?token=/);
    orgId = orgRes.body.organization.id;

    // The invited admin registers WITHOUT tenant details — must attach to org.
    const token = tokenFromInviteUrl(inviteUrl);
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        inviteToken: token,
        admin: {
          email: `dir@${DOMAIN}`,
          firstName: 'Dalila',
          lastName: 'Directrice',
          password: 'DirectricePass1234!',
        },
      })
      .expect(201);

    expect(reg.body.user.role).toBe('SCHOOL_ADMIN');
    expect(reg.body.tenant.id).toBe(orgId);
    expect(reg.body.tenant.onboardingCompleted).toBe(false);
    expect(reg.body.tenant.status).toBe('PENDING_ONBOARDING');

    // No second tenant was created for this admin email.
    const tenants = await prisma.tenant.findMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
    expect(tenants).toHaveLength(1);
  });

  it('blocking onboarding: status → complete → ACTIVE + onboardingCompleted', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `dir@${DOMAIN}`, password: 'DirectricePass1234!' })
      .expect(200);
    const adminToken: string = login.body.accessToken;
    expect(login.body.tenant.onboardingCompleted).toBe(false);

    const status = await request(app.getHttpServer())
      .get('/api/onboarding/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(status.body.completed).toBe(false);
    expect(status.body.organization.name).toBe('GTM École Avenir');

    const done = await request(app.getHttpServer())
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'GTM École de l’Avenir',
        brand: { primaryColor: '#0ea5e9', secondaryColor: '#0f172a' },
      })
      .expect(201);
    expect(done.body.completed).toBe(true);
    expect(done.body.organization.status).toBe('ACTIVE');
    expect(done.body.brand.primaryColor).toBe('#0ea5e9');

    // /auth/me now reports the unlocked state.
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(me.body.tenant.onboardingCompleted).toBe(true);
    expect(me.body.tenant.name).toBe('GTM École de l’Avenir');
  });

  it('isolation: a COMMERCIAL cannot reach the Klasso platform console (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${commercialToken}`)
      .expect(403);
  });

  it('isolation: a SCHOOL_ADMIN cannot manage commercials nor list organizations (403)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `dir@${DOMAIN}`, password: 'DirectricePass1234!' })
      .expect(200);
    const adminToken: string = login.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/commercial/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/commercial/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `x@${DOMAIN}`, firstName: 'X', lastName: 'Y', password: 'Whatever12345' })
      .expect(403);
  });

  it('COMMERCIAL lists only its own organizations; SUPER_ADMIN sees them too', async () => {
    const mine = await request(app.getHttpServer())
      .get('/api/commercial/organizations')
      .set('Authorization', `Bearer ${commercialToken}`)
      .expect(200);
    const mySlugs = (mine.body as Array<{ slug: string }>).map((o) => o.slug);
    expect(mySlugs).toContain(`${SLUG_PREFIX}avenir`);

    const all = await request(app.getHttpServer())
      .get('/api/commercial/organizations')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    const allSlugs = (all.body as Array<{ slug: string }>).map((o) => o.slug);
    expect(allSlugs).toContain(`${SLUG_PREFIX}avenir`);
  });

  it('GET a single organization returns its summary (commercial)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/commercial/organizations/${orgId}`)
      .set('Authorization', `Bearer ${commercialToken}`)
      .expect(200);
    expect(res.body.id).toBe(orgId);
    expect(res.body.slug).toBe(`${SLUG_PREFIX}avenir`);
  });

  it('GET commercial agents lists the created COMMERCIAL (SUPER_ADMIN)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/commercial/agents')
      .set('Authorization', `Bearer ${superToken}`)
      .expect(200);
    const emails = (res.body as Array<{ email: string }>).map((a) => a.email);
    expect(emails).toContain(`commercial@${DOMAIN}`);
  });

  it('contract download URL endpoint responds (200 if R2 configured, else 503)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/commercial/organizations/${orgId}/contract`)
      .set('Authorization', `Bearer ${commercialToken}`);
    // R2 may be disabled in CI/dev → 503; when configured → 200 with a URL.
    expect([200, 503]).toContain(res.status);
  });
});

async function cleanup(prisma: PrismaService): Promise<void> {
  await prisma.refreshToken
    .deleteMany({ where: { user: { OR: [{ email: { endsWith: `@${DOMAIN}` } }, { tenant: { slug: { startsWith: SLUG_PREFIX } } }] } } })
    .catch(() => undefined);
  await prisma.inviteToken
    .deleteMany({ where: { OR: [{ invitedEmail: { endsWith: `@${DOMAIN}` } }, { tenant: { slug: { startsWith: SLUG_PREFIX } } }] } })
    .catch(() => undefined);
  await prisma.contract
    .deleteMany({ where: { tenant: { slug: { startsWith: SLUG_PREFIX } } } })
    .catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [
          { user: { email: { endsWith: `@${DOMAIN}` } } },
          { tenant: { slug: { startsWith: SLUG_PREFIX } } },
        ],
      },
    })
    .catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } }).catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { tenant: { slug: { startsWith: SLUG_PREFIX } } } })
    .catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } }).catch(() => undefined);
}
