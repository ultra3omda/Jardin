/**
 * RLS R1.5 — coverage guard. Asserts that EVERY tenant-scoped table (any table
 * with a "tenantId" column, minus the documented platform-managed exceptions)
 * has Row-Level Security ENABLED and a `tenant_isolation` policy. The DB twin of
 * `tenant-scoped-models.spec.ts`: it fails CI if a future migration adds a
 * tenantId column without enabling RLS on it.
 */
import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const raw = new PrismaClient();

// Mirrors TENANT_SCOPED_EXCEPTIONS (tenant.extension.ts): platform-managed,
// deliberately NOT under RLS.
const EXCEPTION_TABLES = ['contracts', 'invite_tokens'];

describe('RLS coverage (R1.5)', () => {
  afterAll(async () => {
    await raw.$disconnect();
  });

  it('every tenant-scoped table has RLS enabled + a tenant_isolation policy', async () => {
    const expected = (
      await raw.$queryRawUnsafe<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.columns
         WHERE table_schema = 'public' AND column_name = 'tenantId'
           AND table_name NOT IN ('contracts', 'invite_tokens')`,
      )
    ).map((r) => r.table_name);

    const rlsEnabled = new Set(
      (
        await raw.$queryRawUnsafe<Array<{ relname: string }>>(
          `SELECT relname FROM pg_class WHERE relkind = 'r' AND relrowsecurity = true`,
        )
      ).map((r) => r.relname),
    );

    const policied = new Set(
      (
        await raw.$queryRawUnsafe<Array<{ tablename: string }>>(
          `SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND policyname = 'tenant_isolation'`,
        )
      ).map((r) => r.tablename),
    );

    // Sanity: the introspection actually found the tenant tables (~57).
    expect(expected.length).toBeGreaterThan(50);

    const missing = expected.filter((t) => !rlsEnabled.has(t) || !policied.has(t));
    expect(missing, `tenant-scoped tables missing RLS+policy: ${missing.join(', ')}`).toEqual([]);

    // The exceptions must NOT be under our policy (documented opt-out).
    for (const ex of EXCEPTION_TABLES) {
      expect(policied.has(ex), `${ex} should be a documented RLS exception`).toBe(false);
    }
  });
});
