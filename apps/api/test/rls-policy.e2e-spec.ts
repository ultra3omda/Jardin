/**
 * RLS mechanism validation (ADR/plan: docs/superpowers/plans/2026-06-15-postgres-rls-implementation.md).
 *
 * This is "Phase 0" — proving the Row-Level Security POLICY PATTERN blocks
 * cross-tenant access on real Postgres 16, executed in CI instead of a manual
 * Neon branch spike. It is fully self-contained: it builds throwaway probe
 * tables + a non-superuser role and exercises the exact policy expression the
 * plan will apply to the real tables. It does NOT touch the app runtime nor
 * enable RLS on any production table — zero prod risk.
 *
 * Why a dedicated role: superusers (and the CI `postgres` user) ALWAYS bypass
 * RLS. We `SET LOCAL ROLE` to a non-superuser, non-BYPASSRLS role inside each
 * transaction so the policies actually take effect (and `set_config(...,true)`
 * scopes the tenant var to that same transaction/connection — the Neon
 * transaction-pooling-safe pattern).
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const raw = new PrismaClient();

const STRICT_POLICY = `
  current_setting('app.bypass_rls', true) = 'on'
  OR tenant_id = current_setting('app.current_tenant', true)
`;
// Platform-shared models (User/RefreshToken/AuditLog) also expose tenant_id IS NULL rows.
const SHARED_POLICY = `${STRICT_POLICY} OR tenant_id IS NULL`;

/** Run `fn` as the non-privileged probe role, with the tenant context vars set LOCAL to the tx. */
async function asProbe<T>(
  ctx: { tenant: string; bypass?: 'on' | 'off' },
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return raw.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL ROLE rls_probe_role');
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant', $1, true), set_config('app.bypass_rls', $2, true)`,
      ctx.tenant,
      ctx.bypass ?? 'off',
    );
    return fn(tx);
  });
}

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id).sort();

describe('RLS policy mechanism (Phase 0 — CI proof)', () => {
  // Run each DDL/DML statement individually — $executeRawUnsafe sends one
  // command per call (no multi-statement strings).
  async function execAll(statements: string[]): Promise<void> {
    for (const sql of statements) {
      await raw.$executeRawUnsafe(sql);
    }
  }

  beforeAll(async () => {
    await execAll([
      'DROP TABLE IF EXISTS rls_probe',
      'DROP TABLE IF EXISTS rls_probe_shared',
      'CREATE TABLE rls_probe (id text PRIMARY KEY, tenant_id text NOT NULL)',
      'CREATE TABLE rls_probe_shared (id text PRIMARY KEY, tenant_id text)',
      `INSERT INTO rls_probe (id, tenant_id) VALUES ('a1','tA'),('a2','tA'),('b1','tB')`,
      `INSERT INTO rls_probe_shared (id, tenant_id) VALUES ('a1','tA'),('b1','tB'),('p1',NULL)`,
      'ALTER TABLE rls_probe ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE rls_probe FORCE ROW LEVEL SECURITY',
      'ALTER TABLE rls_probe_shared ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE rls_probe_shared FORCE ROW LEVEL SECURITY',
      `CREATE POLICY tenant_isolation ON rls_probe USING (${STRICT_POLICY}) WITH CHECK (${STRICT_POLICY})`,
      `CREATE POLICY tenant_isolation ON rls_probe_shared USING (${SHARED_POLICY}) WITH CHECK (${SHARED_POLICY})`,
      'DROP ROLE IF EXISTS rls_probe_role',
      'CREATE ROLE rls_probe_role',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON rls_probe, rls_probe_shared TO rls_probe_role',
    ]);
  });

  afterAll(async () => {
    await execAll([
      'DROP TABLE IF EXISTS rls_probe',
      'DROP TABLE IF EXISTS rls_probe_shared',
      'DROP ROLE IF EXISTS rls_probe_role',
    ]);
    await raw.$disconnect();
  });

  it('scopes SELECT to the current tenant (cross-tenant rows invisible)', async () => {
    const rows = await asProbe({ tenant: 'tA' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM rls_probe'),
    );
    expect(ids(rows)).toEqual(['a1', 'a2']);
  });

  it('cannot escape its tenant even with an explicit cross-tenant WHERE', async () => {
    const rows = await asProbe({ tenant: 'tA' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM rls_probe WHERE tenant_id = 'tB'`),
    );
    expect(rows).toHaveLength(0);
  });

  it('rejects an INSERT for another tenant (WITH CHECK)', async () => {
    await expect(
      asProbe({ tenant: 'tA' }, (tx) =>
        tx.$executeRawUnsafe(`INSERT INTO rls_probe (id, tenant_id) VALUES ('x1','tB')`),
      ),
    ).rejects.toThrow();
  });

  it('allows an INSERT for the current tenant', async () => {
    await asProbe({ tenant: 'tA' }, (tx) =>
      tx.$executeRawUnsafe(`INSERT INTO rls_probe (id, tenant_id) VALUES ('a3','tA')`),
    );
    const rows = await asProbe({ tenant: 'tA' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM rls_probe'),
    );
    expect(ids(rows)).toContain('a3');
  });

  it('fails closed when no tenant context is set (empty var → 0 rows)', async () => {
    const rows = await asProbe({ tenant: '' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM rls_probe'),
    );
    expect(rows).toHaveLength(0);
  });

  it('bypass mode (SUPER_ADMIN) sees every tenant', async () => {
    const rows = await asProbe({ tenant: '', bypass: 'on' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM rls_probe'),
    );
    expect(ids(rows)).toEqual(expect.arrayContaining(['a1', 'a2', 'b1']));
  });

  it('platform-shared policy exposes the current tenant AND tenant_id IS NULL rows', async () => {
    const rows = await asProbe({ tenant: 'tA' }, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM rls_probe_shared'),
    );
    // Sees its own tenant row + the platform (NULL) row, never tenant B's.
    expect(ids(rows)).toEqual(['a1', 'p1']);
  });
});
