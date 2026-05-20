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
