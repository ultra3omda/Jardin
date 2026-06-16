-- R1.5 — Generalize Row-Level Security to EVERY tenant-scoped table.
--
-- Introspective + idempotent: enables RLS and a uniform `tenant_isolation`
-- policy on every table that has a "tenantId" column, EXCEPT the two documented
-- platform-managed exceptions (contracts, invite_tokens — mirrors
-- TENANT_SCOPED_EXCEPTIONS in tenant.extension.ts). That set is exactly
-- TENANT_SCOPED_MODELS: tenant-scoped-models.spec.ts enforces the invariant that
-- every model with a tenantId is either scoped or one of those exceptions, so
-- this can never silently miss (or over-cover) a table.
--
-- ENABLE only, NO FORCE — load-bearing: in production the app is the table
-- OWNER and therefore BYPASSES RLS (zero behaviour change; RLS stays inert until
-- R1.6 switches prod to a dedicated non-owner role). In CI the postgres
-- superuser also bypasses, so existing suites are unaffected; the dedicated
-- rls-* tests SET LOCAL ROLE to a non-superuser role to exercise enforcement.
--
-- Uniform policy includes `OR "tenantId" IS NULL` so the platform-shared tables
-- (users / refresh_tokens / audit_logs, nullable tenantId) keep their platform
-- rows (COMMERCIAL/SUPER_ADMIN accounts, platform sessions/audit) visible. It is
-- harmless on strict NOT NULL tables (no NULL rows can exist there).
--
-- Rollback per table: DROP POLICY tenant_isolation ON "<t>"; ALTER TABLE "<t>" DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  pol text := 'current_setting(''app.bypass_rls'', true) = ''on'' OR "tenantId" = current_setting(''app.current_tenant'', true) OR "tenantId" IS NULL';
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenantId'
      AND table_name NOT IN ('contracts', 'invite_tokens')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (%s) WITH CHECK (%s)', t, pol, pol);
  END LOOP;
END $$;
