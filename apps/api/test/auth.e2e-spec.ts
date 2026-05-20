/**
 * Auth e2e — exercises the full HTTP flow against a real Postgres database.
 *
 * Requires: docker compose up -d  (postgres healthy)
 *         + pnpm prisma migrate dev (schema applied)
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TenantType } from '@prisma/client';
import * as request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const adminPassword = 'TestPassword1234!';
  const tenantPayload = {
    name: 'Acme E2E',
    slug: `acme-e2e-${Date.now().toString(36)}`,
    type: TenantType.KINDERGARTEN,
  } as const;
  const adminPayload = {
    email: `admin-${Date.now().toString(36)}@acme.test`,
    firstName: 'Acme',
    lastName: 'Admin',
    password: adminPassword,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean only the rows we touch — keeps seeds intact if present
    await prisma.refreshToken.deleteMany({ where: { user: { email: adminPayload.email.toLowerCase() } } });
    await prisma.auditLog.deleteMany({ where: { user: { email: adminPayload.email.toLowerCase() } } });
    await prisma.user.deleteMany({ where: { email: adminPayload.email.toLowerCase() } });
    await prisma.tenant.deleteMany({ where: { slug: tenantPayload.slug } });
  });

  it('completes a full register → login → me → refresh → logout flow', async () => {
    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ tenant: tenantPayload, admin: adminPayload })
      .expect(201);

    expect(registerRes.body.accessToken).toBeTypeOf('string');
    expect(registerRes.body.refreshToken).toBeTypeOf('string');
    expect(registerRes.body.tenant.slug).toBe(tenantPayload.slug);
    expect(registerRes.body.user.email).toBe(adminPayload.email.toLowerCase());

    // Login (with the same credentials, mixed-case email to verify normalization)
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminPayload.email.toUpperCase(), password: adminPassword })
      .expect(200);

    const accessToken: string = loginRes.body.accessToken;
    const refreshToken: string = loginRes.body.refreshToken;
    expect(accessToken).toBeTypeOf('string');
    expect(refreshToken).toBeTypeOf('string');

    // /me
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.user.email).toBe(adminPayload.email.toLowerCase());
    expect(meRes.body.tenant.slug).toBe(tenantPayload.slug);

    // Refresh
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshRes.body.refreshToken).not.toBe(refreshToken);

    // Reusing the OLD refresh token now reports reuse (401) and revokes chain
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    // The newly issued refresh token is also revoked by the chain wipe
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(401);
  });

  it('returns 401 on bad password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ tenant: tenantPayload, admin: adminPayload })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminPayload.email, password: 'WrongPassword12345' })
      .expect(401);
  });

  it('returns 400 when slug is already taken', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ tenant: tenantPayload, admin: adminPayload })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        tenant: tenantPayload,
        admin: { ...adminPayload, email: `other-${Date.now()}@acme.test` },
      })
      .expect(400);
  });

  it('rejects /me without a token (global JWT guard)', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
