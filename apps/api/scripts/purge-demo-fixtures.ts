/* eslint-disable no-console */
/**
 * Ops helper — Purge the seeded sales/marketing demo fixtures from a database
 * (production-safe, idempotent).
 *
 * Background :
 * Early seeds created GTM demo fixtures that polluted the super-admin views:
 *   - a demo commercial sub-admin  (commercial@klasso.tn)
 *   - a demo signed contract       (reference KL-2026-DEMO)
 *   - fake demo requests           (AuditLog rows with requestId `dr_seed_*`)
 * These are no longer seeded in production (seed.ts gates them behind
 * SEED_DEMO_CONTENT). This script removes any that already exist.
 *
 * What it does NOT touch :
 *   - The 3 demo schools (demo-ecole, demo-maternelle, demo-lycee-avenir) and
 *     their content — they back the public demo-login and are simply hidden
 *     from the super-admin views by the `demo-*` slug filter.
 *   - The real super-admin (support@klasso.tn) or any real tenant/user.
 *
 * Usage (Railway shell) :
 *   railway run --service api pnpm --filter=@ecole-saas/api exec tsx scripts/purge-demo-fixtures.ts
 *
 * Usage (local against a prod DATABASE_URL) :
 *   DATABASE_URL="postgres://..." pnpm --filter=@ecole-saas/api exec tsx scripts/purge-demo-fixtures.ts
 */
import { PrismaClient, UserRole } from '@prisma/client';

const DEMO_COMMERCIAL_EMAIL = 'commercial@klasso.tn';
const DEMO_CONTRACT_REFERENCE = 'KL-2026-DEMO';
const DEMO_REQUEST_ID_PREFIX = 'dr_seed_';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    // 1. Fake demo requests (event-sourced in AuditLog, requestId `dr_seed_*`).
    const demoRequests = await prisma.auditLog.deleteMany({
      where: {
        action: { in: ['demo.requested', 'demo.status_changed'] },
        metadata: { path: ['requestId'], string_starts_with: DEMO_REQUEST_ID_PREFIX },
      },
    });

    // 2. Demo signed contract (reference KL-2026-DEMO). No FK on createdById,
    //    so it can be removed independently of the commercial agent.
    const contracts = await prisma.contract.deleteMany({
      where: { reference: DEMO_CONTRACT_REFERENCE },
    });

    // 3. Demo commercial sub-admin (platform user, tenantId null).
    const commercials = await prisma.user.deleteMany({
      where: { tenantId: null, email: DEMO_COMMERCIAL_EMAIL, role: UserRole.COMMERCIAL },
    });

    console.log('');
    console.log('───────────────────────────────────────────────────────────');
    console.log('  ✅ Demo fixtures purged');
    console.log('───────────────────────────────────────────────────────────');
    console.log(`  Demo requests removed   : ${demoRequests.count}`);
    console.log(`  Demo contracts removed  : ${contracts.count}`);
    console.log(`  Commercial agents removed: ${commercials.count}`);
    console.log('───────────────────────────────────────────────────────────');
    console.log('  The 3 demo schools (demo-*) are kept for the public demo');
    console.log('  login and remain hidden from the super-admin views.');
    console.log('───────────────────────────────────────────────────────────');
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Purge failed:', err);
  process.exit(1);
});
