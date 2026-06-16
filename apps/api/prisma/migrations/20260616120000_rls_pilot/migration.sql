-- R1.4 — Row-Level Security pilot on 3 tenant-scoped tables.
--
-- ENABLE only, NO FORCE — deliberate and load-bearing:
--   * In production the app connects as the table OWNER (the Neon role that ran
--     the migrations). Without FORCE, the owner BYPASSES RLS, so production
--     behaviour is unchanged and RLS stays inert until R1.6 switches the prod
--     app to a dedicated NON-owner role. Zero prod risk from this migration.
--   * In CI the app runs as the `postgres` superuser, which also bypasses RLS,
--     so the existing suites are unaffected. The dedicated rls-pilot test
--     `SET LOCAL ROLE`s to a non-superuser, non-BYPASSRLS role — which IS
--     subject to RLS — and asserts cross-tenant access is blocked.
--
-- Policy mirrors the one proven in Phase 0 (apps/api/test/rls-policy.e2e-spec.ts):
-- bypass flag OR tenant match. The column is "tenantId" (Prisma camelCase).
-- Rollback: DROP POLICY tenant_isolation ON "<t>"; ALTER TABLE "<t>" DISABLE ROW LEVEL SECURITY;

ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "students"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant', true));

ALTER TABLE "grades" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "grades"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant', true));

ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "attendance"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant', true));
