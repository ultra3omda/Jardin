/* eslint-disable no-console */
import { randomBytes } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { Locale, PrismaClient, TenantType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Generates a strong random password (URL-safe, 24 chars, ~144 bits of entropy).
 * Printed once to stdout when running `prisma db seed` — copy it for local
 * testing. Never used in production.
 */
function generateSeedPassword(): string {
  return randomBytes(18).toString('base64url');
}

/**
 * Normalizes an email exactly like the auth service: lowercase + trim.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * V6 — Seed 6 default subjects + 3 grade periods (T1/T2/T3) for a tenant.
 * Idempotent via upsert on the unique constraints.
 */
async function seedV6ForTenant(tenantId: string, schoolYear: string): Promise<void> {
  const subjects = [
    { name: 'Mathématiques', code: 'MATH' },
    { name: 'Français', code: 'FR' },
    { name: 'Sciences', code: 'SCI' },
    { name: 'Histoire-Géographie', code: 'HG' },
    { name: 'Anglais', code: 'EN' },
    { name: 'Éducation Physique', code: 'EPS' },
  ];
  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { unique_subject_per_tenant: { tenantId, name: s.name } },
      update: {},
      create: { id: createId(), tenantId, name: s.name, code: s.code },
    });
  }

  const [y1, y2] = schoolYear.split('-');
  const periods = [
    { name: 'T1', startDate: new Date(`${y1}-09-01`), endDate: new Date(`${y1}-12-15`) },
    { name: 'T2', startDate: new Date(`${y2}-01-05`), endDate: new Date(`${y2}-03-31`) },
    { name: 'T3', startDate: new Date(`${y2}-04-15`), endDate: new Date(`${y2}-06-30`) },
  ];
  for (const p of periods) {
    await prisma.gradePeriod.upsert({
      where: { unique_period_per_year: { tenantId, schoolYear, name: p.name } },
      update: {},
      create: {
        id: createId(),
        tenantId,
        schoolYear,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        isClosed: false,
      },
    });
  }
}

async function main(): Promise<void> {
  const password = generateSeedPassword();
  const passwordHash = await bcrypt.hash(password, 12);

  // -----------------------------------------------------------------------
  // Tenants
  // -----------------------------------------------------------------------
  const kindergarten = await prisma.tenant.upsert({
    where: { slug: 'demo-maternelle' },
    update: {},
    create: {
      id: createId(),
      name: 'Démo Maternelle',
      slug: 'demo-maternelle',
      type: TenantType.KINDERGARTEN,
      locale: Locale.fr,
      timezone: 'Europe/Paris',
    },
  });

  const primarySchool = await prisma.tenant.upsert({
    where: { slug: 'demo-ecole-pilote' },
    update: {},
    create: {
      id: createId(),
      name: 'Démo École Pilote',
      slug: 'demo-ecole-pilote',
      type: TenantType.PRIMARY_SCHOOL,
      locale: Locale.fr,
      timezone: 'Europe/Paris',
    },
  });

  // -----------------------------------------------------------------------
  // Users — 1 school_admin per tenant + 1 cross-tenant super_admin
  // -----------------------------------------------------------------------
  const adminKindergartenEmail = normalizeEmail('admin@demo-maternelle.test');
  const adminPrimarySchoolEmail = normalizeEmail('admin@demo-ecole-pilote.test');
  const superAdminEmail = normalizeEmail('superadmin@ecole-saas.test');

  await prisma.user.upsert({
    where: { email_per_tenant: { tenantId: kindergarten.id, email: adminKindergartenEmail } },
    update: {},
    create: {
      id: createId(),
      tenantId: kindergarten.id,
      email: adminKindergartenEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Maternelle',
      role: UserRole.SCHOOL_ADMIN,
      locale: Locale.fr,
    },
  });

  await prisma.user.upsert({
    where: { email_per_tenant: { tenantId: primarySchool.id, email: adminPrimarySchoolEmail } },
    update: {},
    create: {
      id: createId(),
      tenantId: primarySchool.id,
      email: adminPrimarySchoolEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'École Pilote',
      role: UserRole.SCHOOL_ADMIN,
      locale: Locale.fr,
    },
  });

  // -----------------------------------------------------------------------
  // V6 — Subjects + grade periods for each demo tenant
  // -----------------------------------------------------------------------
  await seedV6ForTenant(kindergarten.id, '2025-2026');
  await seedV6ForTenant(primarySchool.id, '2025-2026');

  // Super admin uses a unique-by-email-where-tenantId-is-null lookup.
  // The @@unique([tenantId, email]) covers this thanks to Postgres treating
  // NULLs as distinct in unique constraints, so we use a manual findFirst.
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { tenantId: null, email: superAdminEmail },
  });
  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        id: createId(),
        tenantId: null,
        email: superAdminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        locale: Locale.fr,
      },
    });
  }

  console.log('');
  console.log('✅ Database seeded successfully.');
  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log(' DEMO ACCOUNTS (development only — never use in production)');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`  Tenant slug: ${kindergarten.slug}`);
  console.log(`    admin    : ${adminKindergartenEmail}`);
  console.log(`  Tenant slug: ${primarySchool.slug}`);
  console.log(`    admin    : ${adminPrimarySchoolEmail}`);
  console.log(`  Super admin: ${superAdminEmail}`);
  console.log('');
  console.log(`  Password (all accounts): ${password}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log('');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
