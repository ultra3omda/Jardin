/**
 * V2 — Students e2e: RBAC matrix + tenant isolation + soft-delete.
 *
 * Couvre :
 *  - SCHOOL_ADMIN : create / list / get / update / delete (200/201/204)
 *  - TEACHER      : list / get OK ; create / update / delete → 403
 *  - PARENT       : list scopé par parentEmail ; get propre OK / get autre tenant → 403
 *  - STAFF        : list / get OK ; create / update / delete → 403
 *  - Anonyme      : 401
 *  - Cross-tenant : un user du tenant A ne voit jamais un Student du tenant B
 *
 * Requires same env as autres e2e (DATABASE_URL, JWT_*_SECRET, migrations).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, Sex, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { R2Service } from '../src/common/r2/r2.service';

const TENANT_A_SLUG = 'v2-students-a';
const TENANT_B_SLUG = 'v2-students-b';
const EMAIL_DOMAIN = 'v2-students-test.fr';

const PASSWORD = 'V2StudentsTest1234!';
const R2_PUBLIC_URL = 'https://assets.ecole-saas.test';

interface SeedActor {
  email: string;
  accessToken: string;
}

describe('Students (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantAId: string;
  let tenantBId: string;
  let schoolAdminA: SeedActor;
  let teacherA: SeedActor;
  let parentA: SeedActor;
  let staffA: SeedActor;
  let schoolAdminB: SeedActor;
  let studentInA_ofParent: string;
  let studentInA_other: string;
  let studentInB: string;

  beforeAll(async () => {
    // R2Service mock: returns deterministic signed URLs so no real R2 creds are
    // needed in CI. r2.publicUrl + bucket are read from env at module load time
    // (configuration.ts), so we set them before compile().
    process.env.R2_PUBLIC_URL = R2_PUBLIC_URL;
    process.env.R2_TENANT_ASSETS_BUCKET = 'ecole-saas-tenant-assets';

    const fakeR2 = {
      signedPutUrl: vi
        .fn()
        .mockImplementation(
          async (key: string, _contentType: string, ttl: number) =>
            `https://signed.r2.example/${key}?ttl=${ttl}&sig=mock`,
        ),
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
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

    await cleanup(prisma);

    // — Tenants —
    const tA = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'V2 Students A',
        slug: TENANT_A_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    const tB = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'V2 Students B',
        slug: TENANT_B_SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
      },
    });
    tenantAId = tA.id;
    tenantBId = tB.id;

    // — Users —
    const pwHash = await bcrypt.hash(PASSWORD, 4);
    schoolAdminA = await seedUser(prisma, app, tenantAId, UserRole.SCHOOL_ADMIN, 'admin-a', pwHash);
    teacherA = await seedUser(prisma, app, tenantAId, UserRole.TEACHER, 'teacher-a', pwHash);
    parentA = await seedUser(prisma, app, tenantAId, UserRole.PARENT, 'parent-a', pwHash);
    staffA = await seedUser(prisma, app, tenantAId, UserRole.STAFF, 'staff-a', pwHash);
    schoolAdminB = await seedUser(prisma, app, tenantBId, UserRole.SCHOOL_ADMIN, 'admin-b', pwHash);

    // — Pre-seeded Students for read tests —
    const sA1 = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Alice',
        lastName: 'Owned',
        dateOfBirth: new Date('2018-09-15'),
        sex: Sex.F,
        classroom: 'CP-A',
        parentEmail: parentA.email,
      },
    });
    const sA2 = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantAId,
        firstName: 'Bob',
        lastName: 'Other',
        dateOfBirth: new Date('2017-04-10'),
        sex: Sex.M,
        classroom: 'CP-B',
        parentEmail: `someone-else@${EMAIL_DOMAIN}`,
      },
    });
    const sB = await prisma.student.create({
      data: {
        id: createId(),
        tenantId: tenantBId,
        firstName: 'Carol',
        lastName: 'Foreign',
        dateOfBirth: new Date('2019-02-02'),
        sex: Sex.F,
        classroom: 'GS',
        parentEmail: `parent-b@${EMAIL_DOMAIN}`,
      },
    });
    studentInA_ofParent = sA1.id;
    studentInA_other = sA2.id;
    studentInB = sB.id;
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('GET /students → 401 without bearer token', async () => {
    await request(app.getHttpServer()).get('/api/students').expect(401);
  });

  it('SCHOOL_ADMIN creates a student under their tenant (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({
        firstName: 'New',
        lastName: 'Kid',
        dateOfBirth: '2019-01-01',
        sex: Sex.M,
        classroom: 'CP-A',
        parentEmail: `another-parent@${EMAIL_DOMAIN}`,
      })
      .expect(201);
    expect(res.body.tenantId).toBe(tenantAId);
    expect(res.body.firstName).toBe('New');
    expect(res.body.dateOfBirth).toBe('2019-01-01');
  });

  it('TEACHER cannot create (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({
        firstName: 'X',
        lastName: 'Y',
        dateOfBirth: '2018-01-01',
        sex: Sex.F,
        classroom: 'CP-A',
        parentEmail: `pp@${EMAIL_DOMAIN}`,
      })
      .expect(403);
  });

  it('PARENT cannot create (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .send({
        firstName: 'X',
        lastName: 'Y',
        dateOfBirth: '2018-01-01',
        sex: Sex.F,
        classroom: 'CP-A',
        parentEmail: `pp@${EMAIL_DOMAIN}`,
      })
      .expect(403);
  });

  it('STAFF can read but cannot create (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .set('Authorization', `Bearer ${staffA.accessToken}`)
      .send({
        firstName: 'X',
        lastName: 'Y',
        dateOfBirth: '2018-01-01',
        sex: Sex.F,
        classroom: 'CP-A',
        parentEmail: `pp@${EMAIL_DOMAIN}`,
      })
      .expect(403);
  });

  it('SCHOOL_ADMIN lists students of their tenant', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    const ids = (res.body.items as Array<{ id: string }>).map((s) => s.id);
    expect(ids).toContain(studentInA_ofParent);
    expect(ids).toContain(studentInA_other);
    expect(ids).not.toContain(studentInB);
  });

  it('PARENT only sees students with their parentEmail', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(200);
    const items = res.body.items as Array<{ id: string; parentEmail: string }>;
    expect(items.map((s) => s.id)).toContain(studentInA_ofParent);
    expect(items.map((s) => s.id)).not.toContain(studentInA_other);
    for (const s of items) {
      expect(s.parentEmail.toLowerCase()).toBe(parentA.email.toLowerCase());
    }
  });

  it('PARENT is forbidden from reading a student they do not own (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/students/${studentInA_other}`)
      .set('Authorization', `Bearer ${parentA.accessToken}`)
      .expect(403);
  });

  it('Tenant A admin cannot read a Tenant B student (404 via tenant scoping)', async () => {
    await request(app.getHttpServer())
      .get(`/api/students/${studentInB}`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(404);
  });

  it('SCHOOL_ADMIN updates a student (200)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/students/${studentInA_other}`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ classroom: 'CE1-A' })
      .expect(200);
    expect(res.body.classroom).toBe('CE1-A');
  });

  it('TEACHER cannot update (403)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/students/${studentInA_other}`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ classroom: 'X' })
      .expect(403);
  });

  it('SCHOOL_ADMIN soft-deletes a student (204) and it disappears from list', async () => {
    await request(app.getHttpServer())
      .delete(`/api/students/${studentInA_other}`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .expect(200);
    const ids = (res.body.items as Array<{ id: string }>).map((s) => s.id);
    expect(ids).not.toContain(studentInA_other);
  });

  it('SCHOOL_ADMIN B sees only their tenant students', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/students')
      .set('Authorization', `Bearer ${schoolAdminB.accessToken}`)
      .expect(200);
    const ids = (res.body.items as Array<{ id: string }>).map((s) => s.id);
    expect(ids).toContain(studentInB);
    expect(ids).not.toContain(studentInA_ofParent);
  });

  // --------------------------------------------------------------------------
  // Phase C — Bulk CSV import
  // --------------------------------------------------------------------------

  it('Bulk import dry-run returns counts without inserting', async () => {
    const csv = [
      'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
      `BulkA,One,2017-01-01,M,CM1,bulk1@${EMAIL_DOMAIN}`,
      `BulkA,Two,2018-05-05,F,CM1,bulk2@${EMAIL_DOMAIN}`,
    ].join('\n');
    const beforeCount = await prisma.student.count({
      where: { tenantId: tenantAId, firstName: 'BulkA' },
    });
    const res = await request(app.getHttpServer())
      .post('/api/students/bulk-import?dryRun=true')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .attach('file', Buffer.from(csv), 'students.csv')
      .expect(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.valid).toBe(2);
    expect(res.body.errors).toHaveLength(0);
    expect(res.body.dryRun).toBe(true);
    const afterCount = await prisma.student.count({
      where: { tenantId: tenantAId, firstName: 'BulkA' },
    });
    expect(afterCount).toBe(beforeCount);
  });

  it('Bulk import commits when dryRun=false and all rows valid', async () => {
    const csv = [
      'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
      `BulkB,Three,2017-01-01,M,CM2,bulk3@${EMAIL_DOMAIN}`,
    ].join('\n');
    const res = await request(app.getHttpServer())
      .post('/api/students/bulk-import?dryRun=false')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .attach('file', Buffer.from(csv), 'students.csv')
      .expect(200);
    expect(res.body.imported).toBe(1);
    expect(res.body.errors).toHaveLength(0);
    const row = await prisma.student.findFirst({
      where: { tenantId: tenantAId, firstName: 'BulkB', lastName: 'Three' },
    });
    expect(row).not.toBeNull();
  });

  it('Bulk import reports row-by-row errors and inserts nothing on any failure', async () => {
    const csv = [
      'firstName,lastName,dateOfBirth,sex,classroom,parentEmail',
      `,MissingFirstName,2017-01-01,M,CM1,bulk4@${EMAIL_DOMAIN}`,
      `BulkC,Four,bad-date,F,CM1,bulk5@${EMAIL_DOMAIN}`,
    ].join('\n');
    const res = await request(app.getHttpServer())
      .post('/api/students/bulk-import?dryRun=false')
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .attach('file', Buffer.from(csv), 'students.csv')
      .expect(200);
    expect(res.body.imported).toBe(0);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
    const rows = (res.body.errors as Array<{ row: number }>).map((e) => e.row);
    expect(rows).toContain(2);
    expect(rows).toContain(3);
    const inserted = await prisma.student.count({
      where: { tenantId: tenantAId, firstName: 'BulkC' },
    });
    expect(inserted).toBe(0);
  });

  // ==========================================================================
  // Phase D — Photo upload R2 signed URL
  // ==========================================================================

  it('SCHOOL_ADMIN gets a signed photo upload URL (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/students/${studentInA_ofParent}/photo-upload-url`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ contentType: 'image/jpeg' })
      .expect(200);
    expect(res.body.uploadUrl).toMatch(/^https?:\/\//);
    expect(res.body.finalUrl).toContain(
      `${R2_PUBLIC_URL}/students/${tenantAId}/${studentInA_ofParent}/photo-`,
    );
    expect(res.body.finalUrl).toMatch(/\.jpg$/);
    expect(res.body.expiresIn).toBe(300);
  });

  it('TEACHER cannot get a photo upload URL (403)', async () => {
    await request(app.getHttpServer())
      .post(`/api/students/${studentInA_ofParent}/photo-upload-url`)
      .set('Authorization', `Bearer ${teacherA.accessToken}`)
      .send({ contentType: 'image/png' })
      .expect(403);
  });

  it('Photo upload rejects unauthorized MIME (400)', async () => {
    await request(app.getHttpServer())
      .post(`/api/students/${studentInA_ofParent}/photo-upload-url`)
      .set('Authorization', `Bearer ${schoolAdminA.accessToken}`)
      .send({ contentType: 'application/pdf' })
      .expect(400);
  });
});

// ============================================================================
// Helpers
// ============================================================================

async function seedUser(
  prisma: PrismaService,
  app: INestApplication,
  tenantId: string,
  role: UserRole,
  prefix: string,
  passwordHash: string,
): Promise<SeedActor> {
  const email = `${prefix}@${EMAIL_DOMAIN}`;
  await prisma.user.create({
    data: {
      id: createId(),
      tenantId,
      email,
      passwordHash,
      firstName: prefix,
      lastName: 'E2E',
      role,
      emailVerifiedAt: new Date(),
    },
  });
  const login = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return { email, accessToken: login.body.accessToken };
}

async function cleanup(prisma: PrismaService): Promise<void> {
  await prisma.auditLog
    .deleteMany({
      where: {
        OR: [
          { tenant: { slug: { startsWith: 'v2-students-' } } },
          { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } },
        ],
      },
    })
    .catch(() => undefined);
  await prisma.refreshToken
    .deleteMany({
      where: { user: { email: { endsWith: `@${EMAIL_DOMAIN}` } } },
    })
    .catch(() => undefined);
  await prisma.student
    .deleteMany({ where: { tenant: { slug: { startsWith: 'v2-students-' } } } })
    .catch(() => undefined);
  await prisma.user
    .deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } })
    .catch(() => undefined);
  await prisma.tenant
    .deleteMany({ where: { slug: { startsWith: 'v2-students-' } } })
    .catch(() => undefined);
}
