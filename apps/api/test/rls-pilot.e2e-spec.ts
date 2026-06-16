/**
 * RLS R1.4 — pilot enforcement on REAL tenant-scoped tables (students, grades,
 * attendance). Companion to the Phase 0 policy proof: Phase 0 proved the policy
 * EXPRESSION on scratch tables; this proves it is actually ENABLED and enforces
 * isolation on the real tables, on Postgres 16, in CI.
 *
 * The CI app connects as the `postgres` superuser (bypasses RLS), so this test
 * `SET LOCAL ROLE`s to a dedicated non-superuser, non-BYPASSRLS role inside each
 * transaction — that role IS subject to RLS — and sets app.current_tenant on the
 * same tx (the Neon transaction-pooling-safe pattern). Seed rows are inserted as
 * the superuser (bypassing RLS).
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const raw = new PrismaClient();

const PILOT_TABLES = ['students', 'grades', 'attendance'] as const;
const SLUG_A = 'rlspilot-a';
const SLUG_B = 'rlspilot-b';

let tenantA: string;
let tenantB: string;
let studentA: string;
let studentB: string;

async function asPilotRole<T>(
  ctx: { tenant: string; bypass?: 'on' | 'off' },
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return raw.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE rls_pilot_role');
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant', $1, true), set_config('app.bypass_rls', $2, true)`,
      ctx.tenant,
      ctx.bypass ?? 'off',
    );
    return fn(tx);
  });
}

describe('RLS pilot — real tables (R1.4)', () => {
  beforeAll(async () => {
    await raw.$executeRawUnsafe('DROP ROLE IF EXISTS rls_pilot_role');
    await raw.$executeRawUnsafe('CREATE ROLE rls_pilot_role');
    await raw.$executeRawUnsafe('GRANT SELECT, UPDATE ON "students" TO rls_pilot_role');

    tenantA = createId();
    tenantB = createId();
    studentA = createId();
    studentB = createId();

    // Seeded as the superuser → bypasses RLS even though it is enabled.
    for (const [id, slug] of [
      [tenantA, SLUG_A],
      [tenantB, SLUG_B],
    ] as const) {
      await raw.tenant.create({
        data: {
          id,
          name: `RLS Pilot ${slug}`,
          slug,
          type: 'PRIMARY_SCHOOL',
          locale: 'fr',
          timezone: 'Africa/Tunis',
          status: 'ACTIVE',
        },
      });
    }
    for (const [id, tid] of [
      [studentA, tenantA],
      [studentB, tenantB],
    ] as const) {
      await raw.student.create({
        data: {
          id,
          tenantId: tid,
          firstName: 'RLS',
          lastName: 'Pilot',
          dateOfBirth: new Date('2015-01-01'),
          sex: 'M',
          classroom: 'CP-A',
          parentEmail: `parent-${id}@rlspilot.test`,
        },
      });
    }
  });

  afterAll(async () => {
    await raw.student.deleteMany({ where: { id: { in: [studentA, studentB] } } });
    await raw.tenant.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
    await raw.$executeRawUnsafe('REVOKE ALL ON "students" FROM rls_pilot_role');
    await raw.$executeRawUnsafe('DROP ROLE IF EXISTS rls_pilot_role');
    await raw.$disconnect();
  });

  it('enables RLS + a tenant_isolation policy on every pilot table', async () => {
    for (const table of PILOT_TABLES) {
      const rls = await raw.$queryRawUnsafe<Array<{ relrowsecurity: boolean }>>(
        `SELECT relrowsecurity FROM pg_class WHERE relname = $1`,
        table,
      );
      expect(rls[0]?.relrowsecurity, `${table} RLS enabled`).toBe(true);
      const policies = await raw.$queryRawUnsafe<Array<{ policyname: string }>>(
        `SELECT policyname FROM pg_policies WHERE tablename = $1 AND policyname = 'tenant_isolation'`,
        table,
      );
      expect(policies, `${table} has tenant_isolation policy`).toHaveLength(1);
    }
  });

  it('scopes SELECT on the real students table to the current tenant', async () => {
    const rows = await asPilotRole({ tenant: tenantA }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM students WHERE id IN ($1, $2)`,
        studentA,
        studentB,
      ),
    );
    expect(rows.map((r) => r.id)).toEqual([studentA]);
  });

  it('rejects moving a student to another tenant (WITH CHECK)', async () => {
    await expect(
      asPilotRole({ tenant: tenantA }, (tx) =>
        tx.$executeRawUnsafe(`UPDATE students SET "tenantId" = $1 WHERE id = $2`, tenantB, studentA),
      ),
    ).rejects.toThrow();
  });

  it('bypass mode (SUPER_ADMIN) sees students of every tenant', async () => {
    const rows = await asPilotRole({ tenant: '', bypass: 'on' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM students WHERE id IN ($1, $2)`,
        studentA,
        studentB,
      ),
    );
    expect(rows.map((r) => r.id).sort()).toEqual([studentA, studentB].sort());
  });
});
