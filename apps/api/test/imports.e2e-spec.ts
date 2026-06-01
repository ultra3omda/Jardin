/**
 * Generic Excel/CSV import engine e2e.
 *
 * Covers: entity listing, template download (.xlsx + .csv), CSV dry-run vs real
 * import (idempotent), header-label remap, atomic failure (bad row rolls back),
 * and RBAC (PARENT forbidden).
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createId } from '@paralleldrive/cuid2';
import { Locale, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

const SLUG = 'imports-e2e';
const DOMAIN = 'imports-e2e.test';
const PASSWORD = 'ImportsE2EPass1234!';

describe('Imports engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken = '';
  let parentToken = '';
  let tenantId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
    prisma = moduleRef.get(PrismaService);
    await cleanup(prisma);

    const tenant = await prisma.tenant.create({
      data: {
        id: createId(),
        name: 'Imports E2E',
        slug: SLUG,
        type: TenantType.PRIMARY_SCHOOL,
        locale: Locale.fr,
        status: 'ACTIVE',
        onboardingCompletedAt: new Date(),
      },
    });
    tenantId = tenant.id;
    const pw = await bcrypt.hash(PASSWORD, 4);
    const mk = (email: string, role: UserRole) =>
      prisma.user.create({
        data: { id: createId(), tenantId, email, passwordHash: pw, firstName: 'A', lastName: 'B', role, emailVerifiedAt: new Date() },
      });
    await mk(`admin@${DOMAIN}`, UserRole.SCHOOL_ADMIN);
    await mk(`parent@${DOMAIN}`, UserRole.PARENT);

    const login = async (email: string) =>
      (await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200)).body
        .accessToken as string;
    adminToken = await login(`admin@${DOMAIN}`);
    parentToken = await login(`parent@${DOMAIN}`);
  });

  afterAll(async () => {
    await cleanup(prisma);
    await app.close();
  });

  it('lists importable entities for an admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/imports/entities')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const ids = (res.body as { id: string }[]).map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['parents', 'teachers', 'students', 'classes', 'meal-plans']));
  });

  it('downloads an .xlsx template (real Excel signature)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/imports/teachers/template')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((response, cb) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    // XLSX files are zip archives → start with "PK".
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK');
  });

  it('downloads a .csv template with French headers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/imports/teachers/template?format=csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.text).toContain('Prénom');
    expect(res.text).toContain('Email');
  });

  it('CSV dry-run validates without inserting, then a real import inserts', async () => {
    const csv = `Prénom,Nom,Email\nKamel,Imp,kamel@${DOMAIN}\nRania,Imp,rania@${DOMAIN}\n`;

    const dry = await request(app.getHttpServer())
      .post('/api/imports/teachers?dryRun=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'teachers.csv')
      .expect(201);
    expect(dry.body).toMatchObject({ total: 2, valid: 2, imported: 0, dryRun: true, errors: [] });

    let count = await prisma.user.count({ where: { tenantId, role: UserRole.TEACHER } });
    expect(count).toBe(0);

    const real = await request(app.getHttpServer())
      .post('/api/imports/teachers?dryRun=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'teachers.csv')
      .expect(201);
    expect(real.body).toMatchObject({ valid: 2, imported: 2, dryRun: false });

    count = await prisma.user.count({ where: { tenantId, role: UserRole.TEACHER } });
    expect(count).toBe(2);

    // Idempotent: re-importing the same file inserts nothing new.
    const again = await request(app.getHttpServer())
      .post('/api/imports/teachers?dryRun=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'teachers.csv')
      .expect(201);
    expect(again.body.imported).toBe(0);
  });

  it('students import fails atomically when a parent account is missing', async () => {
    // A class exists, but the parent email has no account → whole import rolls back.
    await prisma.class.create({
      data: { id: createId(), tenantId, name: 'CP-A', level: 'CP', schoolYear: '2025-2026' },
    });
    const csv = `Prénom,Nom,Date de naissance,Sexe,Classe,Email parent\nTest,Kid,2018-01-01,M,CP-A,ghost@${DOMAIN}\n`;
    const res = await request(app.getHttpServer())
      .post('/api/imports/students?dryRun=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'students.csv')
      .expect(400);
    expect(res.body.code).toBe('IMPORT_FAILED');
    const count = await prisma.student.count({ where: { tenantId } });
    expect(count).toBe(0);
  });

  it('PARENT cannot import (403)', async () => {
    const csv = `Prénom,Nom,Email\nX,Y,x@${DOMAIN}\n`;
    await request(app.getHttpServer())
      .post('/api/imports/teachers?dryRun=true')
      .set('Authorization', `Bearer ${parentToken}`)
      .attach('file', Buffer.from(csv), 't.csv')
      .expect(403);
  });
});

async function cleanup(prisma: PrismaService): Promise<void> {
  await prisma.parentStudent.deleteMany({ where: { tenant: { slug: SLUG } } }).catch(() => undefined);
  await prisma.student.deleteMany({ where: { tenant: { slug: SLUG } } }).catch(() => undefined);
  await prisma.class.deleteMany({ where: { tenant: { slug: SLUG } } }).catch(() => undefined);
  await prisma.auditLog.deleteMany({ where: { tenant: { slug: SLUG } } }).catch(() => undefined);
  await prisma.refreshToken.deleteMany({ where: { user: { email: { endsWith: `@${DOMAIN}` } } } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } }).catch(() => undefined);
  await prisma.tenant.deleteMany({ where: { slug: SLUG } }).catch(() => undefined);
}
