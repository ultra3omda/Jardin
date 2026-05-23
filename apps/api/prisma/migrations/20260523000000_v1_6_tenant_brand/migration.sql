-- V1.6 — White-label per-tenant : Tenant.brand JSONB additive column
-- Decision D20 (2026-05-22 PM, supersedes D19).
-- Spec  : docs/superpowers/specs/2026-05-22-tenant-white-label-app-provisioning.md
-- Plan  : docs/superpowers/plans/2026-05-22-v1.6-white-label-runtime.md
--
-- Additive only. Existing tenants keep brand = NULL → resolved to
-- DEFAULT_BRAND (indigo-600) by the API service (TenantBrandService.findByTenant).

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "brand" JSONB;
