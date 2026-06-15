# ADR 0016 — Commercial pipeline & blocking organization onboarding

**Status:** Accepted
**Date:** 2026-05-31 (amended 2026-06-14 — mobile onboarding gate + COMMERCIAL role, decisions 7–8; 2026-06-15 — server-side gate enforcement, decision 9)
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

### 8. COMMERCIAL role on mobile (amendment, 2026-06-14)

The `COMMERCIAL` role (decisions 1–4) was reachable only on the web. It is now
a first-class persona on mobile, reusing the same API
(`/commercial/organizations*`):

- **Navigation** — `COMMERCIAL` is tenant-less, so (like `SUPER_ADMIN`) it gets
  a minimal platform tab set: dashboard + **Organisations** + notifications +
  profile. Tenant-scoped tabs (students, messaging…) are excluded — they would
  403 under the Prisma isolation extension's platform-role hard-block.
- **Dashboard** — a `CommercialDashboard` shows pipeline KPIs (total / pending
  onboarding / active / contracts) aggregated client-side from the org list via
  the pure, unit-tested `summarizePipeline()`.
- **Organisations** — list (`commercial/index`) with status + invite badges,
  create (`commercial/new`: name + auto-suggested slug + type + admin invite,
  with the `sendInviteEmail` toggle), and a read-only detail (`commercial/[id]`).
- **Contracts** — the signed-PDF **upload** stays web-only (presigned R2 PUT +
  file picker); on mobile an org is created without a contract (rattachable
  later on web). The contract **download** on the detail screen is likewise
  web-only (opens the presigned URL), mirroring the bulletin-PDF pattern.

No API change — the mobile client consumes the existing controller as-is.

### 9. Server-side enforcement of the gate (amendment, 2026-06-15)

The web/mobile gates (decisions 5, 7) are client-side redirects — a modified
client could skip the wizard and mutate tenant data while `PENDING_ONBOARDING`.
The gate is now also enforced at the API by a global `OnboardingGuard`
(`apps/api/src/auth/guards/onboarding.guard.ts`, registered after
`RolesGuard`):

- It blocks **mutating verbs** (POST/PATCH/PUT/DELETE) for a `SCHOOL_ADMIN` whose
  tenant has `status === PENDING_ONBOARDING`, returning `403 ONBOARDING_REQUIRED`.
  `onboarding/complete` flips status to `ACTIVE`, which unlocks writes.
- **Reads always pass** (the admin may inspect their empty workspace), as do
  platform roles (SUPER_ADMIN/COMMERCIAL, no tenant) and every other persona —
  no teacher/parent/staff can exist before onboarding anyway (creating them is
  itself a gated write), so gating `SCHOOL_ADMIN` closes the hole with at most
  one PK lookup per admin write.
- The endpoints the wizard needs are allow-listed with `@AllowDuringOnboarding()`
  (the `onboarding`, `admin/tenant/branding` and `auth` controllers). The
  `users` controller (`/me`: profile, password, sessions, RGPD export/delete,
  notification prefs) is also allow-listed — **account self-management is not a
  tenant-data write** and must work regardless of onboarding (RGPD self-delete
  especially).

**`PENDING_ONBOARDING` is now an explicit, opt-in state.** The `Tenant.status`
column default flips from `PENDING_ONBOARDING` to **`ACTIVE`** (migration
`20260615000000_tenant_status_default_active`); only the two flows that require
the wizard set it explicitly — self-service register (`auth.service`) and the
commercial pipeline (`commercial.service`). Side effect (intended, per D23): an
org created directly by a SUPER_ADMIN via `admin/tenants` is now `ACTIVE`
(immediately usable) instead of bouncing its admin into the wizard. Demo seeds
already set `ACTIVE` explicitly, so they are unaffected.

Keying the guard on `status` (rather than `onboardingCompletedAt`) means a
freshly created org under the new default is operational without a separate
backfill of the timestamp.

Covered by unit tests (guard branches) + e2e (`commercial-onboarding.e2e-spec.ts`:
PENDING write → 403, reads/branding allowed, ACTIVE write unblocked).

## Consequences

- The relations the product needs (student↔parent, student↔class, teacher↔class,
  subject↔level, student↔canteen, …) already existed from earlier waves; this
  wave focused on the genuinely new SaaS pipeline.
- ~~A future hardening item: move the onboarding gate to server-side
  enforcement.~~ **Done (2026-06-15, decision 9)** — the gate is enforced on the
  web, mobile **and** the API.
- `COMMERCIAL` agents are created with an initial password set by the
  super-admin; migrating them to an invite/reset-link flow is a follow-up.
