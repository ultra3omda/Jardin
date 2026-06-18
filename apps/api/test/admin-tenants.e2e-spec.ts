/**
 * V1.8 — Admin Tenants e2e:
 *   super_admin can create a tenant + invite admin, list returns it,
 *   reserved slug is rejected (400 SLUG_RESERVED),
 *   duplicate slug is rejected (409 SLUG_TAKEN).
 *
 * Domain automation describe block (Task 12):
 *   Tests the full provision/active/failed/retry/flag-off flows using
 *   in-memory fakes for DNS_PROVIDER and VercelDomainsClient. The
 *   automation-ON app is built with process.env overrides set before
 *   Test.createTestingModule (configuration() reads process.env at compile
 *   time). Provider overrides are applied via .overrideProvider().
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
import { DNS_PROVIDER } from '../src/dns/dns-provider.interface';
import { VercelDomainsClient } from '../src/dns/vercel-domains.client';

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

  it('persists full branding (colors + logo) provided at creation', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        name: 'École Brand',
        slug: 'v18-brand',
        type: 'PRIMARY_SCHOOL',
        adminEmail: `brand@${TEST_EMAIL_DOMAIN}`,
        adminFirstName: 'B',
        adminLastName: 'R',
        primaryColor: '#112233',
        secondaryColor: '#445566',
        logoUrl: 'https://pub-demo.r2.dev/logo.png',
        sendInviteEmail: false,
      })
      .expect(201);
    expect(res.body.tenant.brand?.primaryColor).toBe('#112233');
    expect(res.body.tenant.brand?.secondaryColor).toBe('#445566');
    expect(res.body.tenant.brand?.logoUrl).toBe('https://pub-demo.r2.dev/logo.png');
  });

  it('SUPER_ADMIN seeds initial personas (teacher/parent/staff) + invites', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/admin/tenants')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        name: 'École Personas',
        slug: 'v18-personas',
        type: 'PRIMARY_SCHOOL',
        adminEmail: `padmin@${TEST_EMAIL_DOMAIN}`,
        adminFirstName: 'P',
        adminLastName: 'A',
        sendInviteEmail: false,
      })
      .expect(201);
    const tenantId = created.body.tenant.id as string;

    const res = await request(app.getHttpServer())
      .post(`/api/admin/tenants/${tenantId}/personas`)
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({
        personas: [
          { role: 'TEACHER', email: `t1@${TEST_EMAIL_DOMAIN}`, firstName: 'Sami', lastName: 'Hadj' },
          { role: 'PARENT', email: `p1@${TEST_EMAIL_DOMAIN}`, firstName: 'Salma', lastName: 'Ben Ali' },
          { role: 'STAFF', email: `s1@${TEST_EMAIL_DOMAIN}`, firstName: 'Omar', lastName: 'Mansour' },
          { role: 'TEACHER', email: `padmin@${TEST_EMAIL_DOMAIN}`, firstName: 'Dup', lastName: 'Licate' },
        ],
      })
      .expect(201);

    expect(res.body.created).toHaveLength(3);
    expect(res.body.skipped).toContain(`padmin@${TEST_EMAIL_DOMAIN}`); // already the admin
    const roles = (res.body.created as Array<{ role: string }>).map((c) => c.role).sort();
    expect(roles).toEqual(['PARENT', 'STAFF', 'TEACHER']);
    expect(res.body.created[0].inviteUrl).toMatch(/\/register\?token=/);

    const users = await prisma.user.findMany({ where: { tenantId } });
    expect(users.map((u) => u.role).sort()).toEqual([
      'PARENT',
      'SCHOOL_ADMIN',
      'STAFF',
      'TEACHER',
    ]);
  });

  it('returns 404 seeding personas for an unknown tenant', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/tenants/does-not-exist/personas')
      .set('Authorization', `Bearer ${superAdminAccessToken}`)
      .send({ personas: [{ role: 'TEACHER', email: `x@${TEST_EMAIL_DOMAIN}`, firstName: 'X', lastName: 'Y' }] })
      .expect(404);
  });
});

// =============================================================================
// Task 12 — Domain Automation e2e (clients mockés)
// =============================================================================
//
// Strategy: build a *separate* NestJS application for each automation variant
// (flag ON / flag OFF / isReady=false). The env vars that configuration() reads
// at module-compile time are set on process.env *before* Test.createTestingModule
// and restored in afterAll. Provider overrides replace the real OVH/Vercel
// clients with vi.fn() spies so no network call is made.
//
// pollIntervalMs=0 + pollMaxAttempts=2 makes the poll loop exit synchronously
// (when isReady returns false after 2 attempts). Setting pollIntervalMs=0
// skips the setTimeout delay (the guard `if (intervalMs > 0)` is in
// DomainProvisioningService.pollReady).
//
// After calling POST /admin/tenants the detached `void this.domains.provision()`
// runs asynchronously. We drain the microtask + I/O queue with
//   await new Promise(r => setImmediate(r))
// repeated until the DB shows the terminal state. Because all awaited ops
// inside provision() are against the real DB (no artificial delay when
// pollIntervalMs=0) this converges quickly.
// =============================================================================

const DA_SLUG_PREFIX = 'da-';
const DA_EMAIL_DOMAIN = 'da-test.klasso';

/** Env vars required by env.validation fail-fast when the flag is on. */
const AUTOMATION_ENVS: Record<string, string> = {
  ENABLE_TENANT_DOMAIN_AUTOMATION: 'true',
  OVH_APP_KEY: 'dummy-ovh-key',
  OVH_APP_SECRET: 'dummy-ovh-secret',
  OVH_CONSUMER_KEY: 'dummy-ovh-ck',
  VERCEL_TOKEN: 'dummy-vercel-token',
  VERCEL_PROJECT_ID: 'dummy-vercel-project',
  DOMAIN_POLL_INTERVAL_MS: '0',
  DOMAIN_POLL_MAX_ATTEMPTS: '2',
};

/** Apply env overrides, returning an undo function. */
function applyEnvOverrides(overrides: Record<string, string>): () => void {
  const originals: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    originals[k] = process.env[k];
    process.env[k] = v;
  }
  return () => {
    for (const [k, orig] of Object.entries(originals)) {
      if (orig === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete process.env[k];
      } else {
        process.env[k] = orig;
      }
    }
  };
}

/** Build a ValidationPipe matching AppModule's global pipe. */
function makeValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

/** Wait for DB to reach a terminal domainStatus (not PROVISIONING). */
async function waitForTerminalStatus(
  prisma: PrismaService,
  tenantId: string,
  maxTicks = 20,
): Promise<string> {
  for (let i = 0; i < maxTicks; i++) {
    await new Promise<void>((r) => setImmediate(r));
    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { domainStatus: true },
    });
    if (t && t.domainStatus !== 'PROVISIONING') return t.domainStatus as string;
  }
  return 'PROVISIONING';
}

describe('domain automation', () => {
  // ---------------------------------------------------------------------------
  // automation ON — happy path (isReady returns true)
  // ---------------------------------------------------------------------------
  describe('flag ON — happy path', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let token: string;
    let restoreEnv: () => void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeDns = {
      findCname: vi.fn().mockResolvedValue(null),
      upsertCname: vi.fn().mockResolvedValue({ id: '1', subDomain: 's', target: 't', ttl: 60 }),
      deleteCname: vi.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeVercel = {
      addDomain: vi.fn().mockResolvedValue(undefined),
      isReady: vi.fn().mockResolvedValue(true),
      removeDomain: vi.fn().mockResolvedValue(undefined),
    };
    const noopResend = { send: vi.fn().mockResolvedValue({ success: true }) };

    beforeAll(async () => {
      restoreEnv = applyEnvOverrides(AUTOMATION_ENVS);

      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DNS_PROVIDER)
        .useValue(fakeDns)
        .overrideProvider(VercelDomainsClient)
        .useValue(fakeVercel)
        .overrideProvider(ResendService)
        .useValue(noopResend)
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(makeValidationPipe());
      app.setGlobalPrefix('api', { exclude: ['health'] });
      await app.init();
      prisma = moduleRef.get(PrismaService);

      await cleanupDaData(prisma);

      // Ensure the SUPER_ADMIN used by this block exists.
      const existing = await prisma.user.findFirst({
        where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN },
      });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: createId(),
            email: SUPER_ADMIN_EMAIL,
            passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
            firstName: 'Super',
            lastName: 'AdminDA',
            role: UserRole.SUPER_ADMIN,
            emailVerifiedAt: new Date(),
          },
        });
      }

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
        .expect(200);
      token = loginRes.body.accessToken as string;
    });

    afterAll(async () => {
      await cleanupDaData(prisma);
      await app.close();
      restoreEnv();
    });

    it('POST /admin/tenants returns domainStatus PROVISIONING with invite null (flag on)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'École DA Active',
          slug: 'da-active',
          type: 'PRIMARY_SCHOOL',
          adminEmail: `admin@${DA_EMAIL_DOMAIN}`,
          adminFirstName: 'DA',
          adminLastName: 'Active',
          sendInviteEmail: false,
        })
        .expect(201);

      expect(res.body.domainStatus).toBe('PROVISIONING');
      expect(res.body.invite).toBeNull();
      expect(res.body.inviteEmailSent).toBe(false);
    });

    it('tenant reaches ACTIVE after provision() settles (isReady=true)', async () => {
      // Slug 'da-active' was created in the previous test; re-use it.
      const tenant = await prisma.tenant.findUnique({ where: { slug: 'da-active' } });
      expect(tenant).not.toBeNull();

      const finalStatus = await waitForTerminalStatus(prisma, tenant!.id);
      expect(finalStatus).toBe('ACTIVE');

      const updated = await prisma.tenant.findUnique({ where: { id: tenant!.id } });
      expect(updated?.customDomain).toBe('da-active.klasso.tn');

      expect(fakeDns.upsertCname).toHaveBeenCalledWith('da-active', expect.any(String));
      expect(fakeVercel.addDomain).toHaveBeenCalledWith('da-active.klasso.tn');
    });

    it('GET /admin/tenants/:id returns domainStatus ACTIVE and customDomain', async () => {
      const tenant = await prisma.tenant.findUnique({ where: { slug: 'da-active' } });
      expect(tenant).not.toBeNull();

      await waitForTerminalStatus(prisma, tenant!.id);

      const res = await request(app.getHttpServer())
        .get(`/api/admin/tenants/${tenant!.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.domainStatus).toBe('ACTIVE');
      expect(res.body.customDomain).toBe('da-active.klasso.tn');
    });

    it('POST /admin/tenants/:id/domain/retry → 202 with domainStatus PROVISIONING', async () => {
      const tenant = await prisma.tenant.findUnique({ where: { slug: 'da-active' } });
      expect(tenant).not.toBeNull();

      const res = await request(app.getHttpServer())
        .post(`/api/admin/tenants/${tenant!.id}/domain/retry`)
        .set('Authorization', `Bearer ${token}`)
        .expect(202);

      expect(res.body.domainStatus).toBe('PROVISIONING');
    });
  });

  // ---------------------------------------------------------------------------
  // automation ON — failure path (isReady always returns false → FAILED)
  // ---------------------------------------------------------------------------
  describe('flag ON — failure path (isReady=false → FAILED)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let token: string;
    let restoreEnv: () => void;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeDnsF = {
      findCname: vi.fn().mockResolvedValue(null),
      upsertCname: vi.fn().mockResolvedValue({ id: '1', subDomain: 's', target: 't', ttl: 60 }),
      deleteCname: vi.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeVercelF = {
      addDomain: vi.fn().mockResolvedValue(undefined),
      isReady: vi.fn().mockResolvedValue(false), // never ready → FAILED after maxAttempts=2
      removeDomain: vi.fn().mockResolvedValue(undefined),
    };
    const noopResendF = { send: vi.fn().mockResolvedValue({ success: true }) };

    beforeAll(async () => {
      restoreEnv = applyEnvOverrides(AUTOMATION_ENVS);

      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(DNS_PROVIDER)
        .useValue(fakeDnsF)
        .overrideProvider(VercelDomainsClient)
        .useValue(fakeVercelF)
        .overrideProvider(ResendService)
        .useValue(noopResendF)
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(makeValidationPipe());
      app.setGlobalPrefix('api', { exclude: ['health'] });
      await app.init();
      prisma = moduleRef.get(PrismaService);

      await cleanupDaData(prisma);

      const existing = await prisma.user.findFirst({
        where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN },
      });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: createId(),
            email: SUPER_ADMIN_EMAIL,
            passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
            firstName: 'Super',
            lastName: 'AdminDA',
            role: UserRole.SUPER_ADMIN,
            emailVerifiedAt: new Date(),
          },
        });
      }

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
        .expect(200);
      token = loginRes.body.accessToken as string;
    });

    afterAll(async () => {
      await cleanupDaData(prisma);
      await app.close();
      restoreEnv();
    });

    it('tenant reaches FAILED when isReady stays false, and domainError is set', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/admin/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'École DA Failed',
          slug: 'da-failed',
          type: 'PRIMARY_SCHOOL',
          adminEmail: `failed@${DA_EMAIL_DOMAIN}`,
          adminFirstName: 'DA',
          adminLastName: 'Failed',
          sendInviteEmail: false,
        })
        .expect(201);

      expect(createRes.body.domainStatus).toBe('PROVISIONING');

      const tenant = await prisma.tenant.findUnique({ where: { slug: 'da-failed' } });
      expect(tenant).not.toBeNull();

      const finalStatus = await waitForTerminalStatus(prisma, tenant!.id);
      expect(finalStatus).toBe('FAILED');

      const updated = await prisma.tenant.findUnique({ where: { id: tenant!.id } });
      expect(updated?.domainError).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // automation OFF — legacy flow (invite present, domainStatus NONE)
  // ---------------------------------------------------------------------------
  describe('flag OFF — legacy flow', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let token: string;
    let restoreEnv: () => void;

    const noopResendLegacy = { send: vi.fn().mockResolvedValue({ success: true }) };

    beforeAll(async () => {
      // Explicitly ensure the flag is OFF (unset or 'false').
      restoreEnv = applyEnvOverrides({ ENABLE_TENANT_DOMAIN_AUTOMATION: 'false' });

      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(ResendService)
        .useValue(noopResendLegacy)
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(makeValidationPipe());
      app.setGlobalPrefix('api', { exclude: ['health'] });
      await app.init();
      prisma = moduleRef.get(PrismaService);

      await cleanupDaData(prisma);

      const existing = await prisma.user.findFirst({
        where: { email: SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN },
      });
      if (!existing) {
        await prisma.user.create({
          data: {
            id: createId(),
            email: SUPER_ADMIN_EMAIL,
            passwordHash: await bcrypt.hash(SUPER_ADMIN_PASSWORD, 4),
            firstName: 'Super',
            lastName: 'AdminDA',
            role: UserRole.SUPER_ADMIN,
            emailVerifiedAt: new Date(),
          },
        });
      }

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: SUPER_ADMIN_EMAIL, password: SUPER_ADMIN_PASSWORD })
        .expect(200);
      token = loginRes.body.accessToken as string;
    });

    afterAll(async () => {
      await cleanupDaData(prisma);
      await app.close();
      restoreEnv();
    });

    it('POST /admin/tenants returns invite (not null) and domainStatus NONE (flag off)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/tenants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'École DA Legacy',
          slug: 'da-legacy',
          type: 'PRIMARY_SCHOOL',
          adminEmail: `legacy@${DA_EMAIL_DOMAIN}`,
          adminFirstName: 'DA',
          adminLastName: 'Legacy',
          sendInviteEmail: false,
        })
        .expect(201);

      expect(res.body.domainStatus).toBe('NONE');
      expect(res.body.invite).not.toBeNull();
      expect(res.body.invite.url).toMatch(/\/register\?token=/);
      expect(res.body.inviteEmailSent).toBe(false);
    });
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

/**
 * Removes domain-automation test leftovers (slugs starting with 'da-').
 * Idempotent — safe to call before & after each DA describe block.
 */
async function cleanupDaData(prisma: PrismaService): Promise<void> {
  await prisma.refreshToken
    .deleteMany({
      where: { user: { tenant: { slug: { startsWith: DA_SLUG_PREFIX } } } },
    })
    .catch(() => undefined);
  await prisma.inviteToken
    .deleteMany({ where: { invitedEmail: { endsWith: `@${DA_EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [
          { user: { email: { endsWith: `@${DA_EMAIL_DOMAIN}` } } },
          { tenant: { slug: { startsWith: DA_SLUG_PREFIX } } },
        ],
      },
    })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${DA_EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { tenant: { slug: { startsWith: DA_SLUG_PREFIX } } } })
    .catch(() => undefined);
  await prisma.tenant
    .deleteMany({ where: { slug: { startsWith: DA_SLUG_PREFIX } } })
    .catch(() => undefined);
}
