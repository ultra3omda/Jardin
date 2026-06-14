# ADR 0016 — Commercial pipeline & blocking organization onboarding

**Status:** Accepted
**Date:** 2026-05-31 (amended 2026-06-14 — mobile onboarding gate, decision 7)
**Wave:** GTM (go-to-market)

## Context

The CEO (SUPER_ADMIN of the Klasso platform) needs a sales workflow:

- Create **COMMERCIAL** sub-admins (sales reps).
- A commercial attaches the **signed contract** and creates the
  **organization** they closed.
- The organization's administrator is **invited by email** to create their
  account.
- After creating the account, the admin must pass through a **blocking
  onboarding wizard** (organization name + colors + logo) before reaching
  the app — they cannot bypass it.
- Once onboarded, the admin manages their full application and has **no
  access** to the Klasso platform that belongs to us.

All of this must respect CLAUDE.md non-negotiables: strict multi-tenant
isolation (verified by automated tests), input validation, no secrets in
source, conventional commits, ≥ 70 % coverage on new business logic.

## Decisions

### 1. `COMMERCIAL` is a platform-level role (tenantId = null)

Like `SUPER_ADMIN`, a COMMERCIAL belongs to no tenant. Unlike SUPER_ADMIN it
is **not** allowed to bypass tenant filtering. To guarantee it can never read
or write a school's data, the Prisma tenant-isolation extension now hard-blocks
any platform-only role (`COMMERCIAL`) from every tenant-scoped model on reads
**and** writes — a defense-in-depth layer on top of RBAC `@Roles` guards.
SUPER_ADMIN keeps its intentional cross-tenant bypass (`skipTenantFilter`).

### 2. Organization lifecycle — `TenantStatus` + `onboardingCompletedAt`

`Tenant` gains `status` (`PENDING_ONBOARDING` → `ACTIVE` → `SUSPENDED`) and a
nullable `onboardingCompletedAt`. A freshly created organization is
`PENDING_ONBOARDING`; completing the wizard flips it to `ACTIVE` and stamps the
timestamp. Existing tenants were backfilled to `ACTIVE` by the migration, and
demo seeds are created `ACTIVE`, so only genuinely new organizations are gated.

### 3. Tenant-bound invites (no placeholder admin user)

`InviteToken` gains an optional `tenantId`. When set, `/auth/register` **attaches**
the new SCHOOL_ADMIN to that existing organization instead of creating a new
one (and no slug is required). The commercial flow creates the tenant + contract
up-front and mints a tenant-bound, email-bound invite; the admin account itself
is provisioned at register time. This avoids the orphaned-placeholder-user issue
of the older `admin/tenants` path.

### 4. Signed contracts stored privately on R2

New `Contract` model (PDF on R2 via `fileKey`, plus signed/start/end dates and
reference). The browser uploads the PDF directly through a presigned PUT URL
(`POST /commercial/contracts/upload-url`); contracts live in the private exports
bucket and are read back via short-lived presigned GET URLs.

### 5. Blocking onboarding gate on the web

The gate is enforced client-side in the `(app)` shell: a SCHOOL_ADMIN whose
`tenant.onboardingCompleted === false` is force-redirected to `/onboarding`
(a standalone route outside the shell) and cannot render any app route until the
wizard is completed. On completion the session is refreshed so the gate unlocks.
The API stays the single source of truth (`/auth/me`, `/onboarding/status`).

### 6. Reuse over reinvention

The onboarding wizard reuses `TenantBrandService` (incl. its anti-SSRF logo
check). The commercial flow reuses `InviteTokensService` and the existing
`InviteEmail` Resend template. No new dependency was added.

### 7. Blocking onboarding gate on mobile (amendment, 2026-06-14)

The original ADR enforced the gate only on the web shell (decision 5), so a
newly-invited SCHOOL_ADMIN who opened the **mobile** app could reach the
dashboard while their organization was still `PENDING_ONBOARDING`. The mobile
app now mirrors the web gate:

- A pure helper `needsOnboarding(user, tenant)` (`apps/mobile/lib/auth/onboarding-gate.ts`)
  returns true only for a `SCHOOL_ADMIN` whose `tenant.onboardingCompleted === false`.
  It **fails open** when the flag is absent (legacy/cached sessions) so we never
  lock out an admin on a stale payload — the API stays the source of truth.
- The gate is applied at the two entry points where a session is established:
  the boot router (`app/index.tsx`, silent refresh) and the login screen
  (`app/(auth)/login.tsx`, both password login and demo personas). When it
  fires, the app routes to `/(onboarding)/setup` instead of the dashboard.
- The mobile wizard (`app/(onboarding)/setup.tsx`) confirms the establishment
  name and an optional primary colour, calls `POST /api/onboarding/complete`
  (same endpoint as web), then `patchTenant({ onboardingCompleted: true,
  status: 'ACTIVE', … })` flips the in-memory session so the gate unlocks
  without a full re-auth.

The mobile wizard is intentionally lighter than the web one (name + colour, no
logo upload yet) — native file upload is deferred, consistent with the rest of
the mobile app. The API and `TenantBrandService` are unchanged.

## Consequences

- The relations the product needs (student↔parent, student↔class, teacher↔class,
  subject↔level, student↔canteen, …) already existed from earlier waves; this
  wave focused on the genuinely new SaaS pipeline.
- A future hardening item: move the onboarding gate to server-side enforcement
  (block tenant-data mutations until `ACTIVE`) in addition to the web/mobile
  client redirects. As of the 2026-06-14 amendment the gate is enforced on both
  clients, but server-side enforcement would close the remaining gap (a modified
  client could still skip the wizard).
- `COMMERCIAL` agents are created with an initial password set by the
  super-admin; migrating them to an invite/reset-link flow is a follow-up.
