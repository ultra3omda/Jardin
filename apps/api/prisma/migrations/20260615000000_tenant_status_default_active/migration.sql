-- Onboarding gate hardening (ADR 0016 §9):
-- A Tenant is "pending onboarding" only when a flow that requires the blocking
-- wizard sets it explicitly (self-service register + commercial pipeline).
-- Every other creation path (admin/tenants, demo seeds, tests) yields an
-- operational org. Flip the column default from PENDING_ONBOARDING to ACTIVE.
-- Existing rows were already backfilled to ACTIVE by the GTM migration, so this
-- only affects future inserts that omit `status`.
ALTER TABLE "tenants" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
