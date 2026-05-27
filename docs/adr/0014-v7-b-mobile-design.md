# 0014 — V7-B Mobile Design (Klasio-inspired mirror of V7-A)

**Date:** 2026-05-27
**Status:** Accepted
**Deciders:** User

## Context

V7-A web design refactor shipped in PR #38 (merged 2026-05-27 at `055c68f`).
Mobile (single Expo app with `EXPO_PUBLIC_PERSONA` switcher per V1.7-A scaffold)
still ran the V1.6 white-label runtime palette + a `<Stack>`-based screen layout.
V7-B brings mobile to design parity with web V7-A.

## Decision

### Single app, not three

Spec V7 §9 mentioned "3 apps Expo : apps/mobile-parent / mobile-teacher /
mobile-admin". **Reality differs**: V1.7-A scaffolded one `apps/mobile` with
`EXPO_PUBLIC_PERSONA` for build-time persona switching (same code, three
binaries at V12 EAS Build time). V7-B builds against the real structure.

### `packages/ui-mobile` workspace package

Shared design tokens (`colors`, `typography`, `spacing`, `radius`) + atomic
components (`Button`, `KpiCard`, `Avatar`). Tokens mirror web `globals.css`
V7 vars exactly (same hex). NativeWind in `apps/mobile/tailwind.config.js`
consumes the same hex values for class-based styling.

### Demo accounts mobile

Mirror web V7-A: 4 buttons (admin-primary, teacher-primary, parent-primary,
parent-kindergarten). STAFF + SUPER_ADMIN excluded from mobile demo (web-only
operators). API endpoint `POST /api/auth/demo-login` reused — same JWT
response shape, same rate-limit 60/h/IP.

### Tab bar persona-aware

`(app)/_layout.tsx` converted from `<Stack>` to `<Tabs>`. `getMobileTabs()`
reads `EXPO_PUBLIC_PERSONA` and returns 4 tabs:
- parent: Accueil / Mon enfant / Messages / Profil
- teacher: Accueil / Mes classes / Messages / Profil
- admin: Tableau / Élèves / Pédagogie / Profil

Default persona = `parent` if env var unset/invalid.

### Dashboard adaptive

`getMobileDashboardConfig(role, tenantType, firstName)` returns 7 variants:
- SCHOOL_ADMIN × PRIMARY / KINDERGARTEN
- TEACHER × PRIMARY / KINDERGARTEN
- PARENT × PRIMARY / KINDERGARTEN
- SUPER_ADMIN (no tenant)

3 KPI cards per variant, simpler than web (no quick actions, no panels —
mobile prioritizes glanceability).

### Tenant type source

Plan originally suggested reading `tenant.type` from `useTenantStore`. Reality:
the mobile `useTenantStore` only exposes `{ slug, name, brand }` (white-label
brand state). The full `AuthTenant` object (with `type: 'KINDERGARTEN' |
'PRIMARY_SCHOOL' | 'MIXED'`) lives on `useAuthStore.tenant`. Dashboard reads
from there.

### `demoLogin` API client

Plan called for direct `fetch` against an exported `apiUrl`. Reality: mobile
client uses module-local `BASE_URL` + a `fetchApi<T>()` helper. `demoLogin`
adapts to use the helper for consistency with `login()` and to mirror its
side-effects (set in-memory access token + persist refresh token in
expo-secure-store), so the caller does not need to know it is a demo flow.

### Out of scope V7-B (V12 or later)

- RTL / AR direction support — V12 Hardening
- Animation polish (Moti / Reanimated) — V12 Hardening
- Demo data reset cron — server-side V8 polish
- Full feature parity per tab (Messages content, Pedagogy content, Profile
  edit form) — those tabs ship as stubs in V7-B and get real implementations
  in their respective waves (Messages = mobile port of V3-B web client at V12,
  etc.)
- Push notifications — V10 Notifications
- Cormorant Garamond loading via expo-font — deferred until first screen that
  needs it (tokens already reference `CormorantGaramond_600SemiBold` but
  fallback to system family if not registered)

### Wave numbering

V7-B follows V7-A — no further renumbering needed (V7-A already bumped
V7-Finance to V8).

## Consequences

**Positive:**
- Mobile design now matches web 1:1 for first-time visitor (login + dashboard).
- `packages/ui-mobile` enables future web→mobile component sharing without
  duplication.
- Demo accounts work on mobile = sales demos can show iOS/Android out of the
  box.

**Negative:**
- 3 placeholder tab screens (Messages / Pedagogy / Profile) ship empty;
  visible but un-actionable. Documented in app copy ("Disponible bientôt").
- Cormorant font not loaded at runtime in V7-B — heading typography falls
  back to system font on mobile. Web parity not exact until V12 typography
  pass.
- Manual mobile testing only (Expo Go or EAS preview). No automated tests
  for mobile screens in V7-B; CI lint deferred to V12 (per existing
  `apps/mobile/package.json` lint script).

## References

- Spec : `docs/superpowers/specs/2026-05-27-v7-design-refactor.md` §9
- Plan : `docs/superpowers/plans/2026-05-27-v7-b-mobile-design.md`
- Web parallel ADR : `docs/adr/0013-v7-design-system.md`
- API demo-login : `apps/api/src/demo-login/` (V7-A)
- Package : `packages/ui-mobile/`
- Mobile screens : `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(app)/_layout.tsx`, `apps/mobile/app/(app)/dashboard.tsx`
