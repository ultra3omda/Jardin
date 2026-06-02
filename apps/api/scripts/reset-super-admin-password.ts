/* eslint-disable no-console */
/**
 * V1.8 helper — Reset the super_admin password (production-safe).
 *
 * Why this script :
 * The V1 seed (apps/api/prisma/seed.ts) generates a random password and prints
 * it ONCE at stdout. Once lost, super_admin access is locked. This script
 * lets ops re-issue a password without re-running the full seed (which would
 * also touch the demo SCHOOL_ADMIN passwords and any non-idempotent steps
 * added later).
 *
 * Behaviour :
 * 1. Read `SUPER_ADMIN_EMAIL` env (default `superadmin@ecole-saas.test`)
 * 2. Read `SUPER_ADMIN_NEW_PASSWORD` env. If absent, generate a 24-char
 *    URL-safe random password (~144 bits of entropy).
 * 3. Upsert the user :
 *    - If exists → update `passwordHash`, set `emailVerifiedAt` if NULL,
 *      set `passwordChangedAt = now()` (invalidates existing refresh tokens
 *      per the auth flow's `passwordChangedAt` check).
 *    - If missing → create with `tenantId: null`, `role: SUPER_ADMIN`,
 *      `emailVerifiedAt: now()`.
 * 4. Print the credentials ONCE (copy them, they're gone after the process exits).
 *
 * Usage (from Railway shell — recommended) :
 *   railway run --service api pnpm --filter=@ecole-saas/api exec tsx scripts/reset-super-admin-password.ts
 *
 * Usage (local with prod DB) :
 *   DATABASE_URL="postgres://..." pnpm --filter=@ecole-saas/api exec tsx scripts/reset-super-admin-password.ts
 *
 * Usage with a chosen password :
 *   SUPER_ADMIN_NEW_PASSWORD="MyOwnPassword1234!" railway run --service api pnpm --filter=@ecole-saas/api exec tsx scripts/reset-super-admin-password.ts
 *
 * Security note :
 * - The password is printed to stdout. Run this script in a private terminal,
 *   not in a shared CI log.
 * - All existing super_admin refresh tokens become unusable after this script
 *   (passwordChangedAt invalidates them in the JWT refresh flow).
 * - The script is idempotent — running it twice in a row gives two different
 *   passwords. Only the last one works.
 */
import { randomBytes } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import { Locale, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const DEFAULT_SUPER_ADMIN_EMAIL = 'support@klasso.tn';
const PASSWORD_BYTES = 18; // 18 raw bytes → 24 chars in base64url
const BCRYPT_ROUNDS = 12;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generatePassword(): string {
  return randomBytes(PASSWORD_BYTES).toString('base64url');
}

async function main(): Promise<void> {
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL);
  const newPassword = process.env.SUPER_ADMIN_NEW_PASSWORD ?? generatePassword();
  const passwordWasGenerated = !process.env.SUPER_ADMIN_NEW_PASSWORD;

  if (newPassword.length < 12) {
    throw new Error(
      `SUPER_ADMIN_NEW_PASSWORD must be at least 12 characters (got ${newPassword.length})`,
    );
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const now = new Date();

    // Super_admin is identified by (tenantId: null, email). Postgres treats
    // NULLs as distinct in unique constraints, so use findFirst rather than
    // the email_per_tenant compound key.
    const existing = await prisma.user.findFirst({
      where: { tenantId: null, email, role: UserRole.SUPER_ADMIN },
    });

    let action: 'created' | 'updated';
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          passwordChangedAt: now,
          emailVerifiedAt: existing.emailVerifiedAt ?? now,
          deletedAt: null,
        },
      });
      action = 'updated';
    } else {
      await prisma.user.create({
        data: {
          id: createId(),
          tenantId: null,
          email,
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: UserRole.SUPER_ADMIN,
          locale: Locale.fr,
          emailVerifiedAt: now,
          passwordChangedAt: now,
        },
      });
      action = 'created';
    }

    console.log('');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`  ✅ Super_admin ${action}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log(`  Email    : ${email}`);
    console.log(`  Password : ${newPassword}`);
    if (passwordWasGenerated) {
      console.log('  (generated — copy NOW, it is not stored anywhere)');
    } else {
      console.log('  (from SUPER_ADMIN_NEW_PASSWORD env)');
    }
    console.log('───────────────────────────────────────────────────────────');
    console.log('  All existing super_admin refresh tokens are now invalid.');
    console.log('  Login again via the web UI to get a fresh session.');
    console.log('───────────────────────────────────────────────────────────');
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
