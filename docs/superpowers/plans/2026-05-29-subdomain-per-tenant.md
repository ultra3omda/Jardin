# Track 1 — Subdomain-per-tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make « 1 web app par école à `<slug>.klasso.tn` + apps mobiles partagées » correct as an *envelope*: tenant subdomains drive branding + redirection only, the JWT `tenantId` stays the sole isolation source, and the mobile binary renders tabs from the connected role at runtime.

**Architecture:** Approach A from the approved spec (`docs/superpowers/specs/2026-05-29-subdomain-per-tenant-design.md`). The web subdomain is cosmetic: the middleware rewrites **only** branded pre-auth pages to `/t/{slug}`, authenticated pages pass through (tenant from JWT). CORS accepts `*.klasso.tn` via a narrow callback; the web CSP points at the real Railway API host + `wss://`. Mobile replaces the build-time `EXPO_PUBLIC_PERSONA` tab selection with a runtime `getTabsForRole(user.role)`. **No Prisma migration.** Final DNS activation is gated and out of scope (ADR 0007).

**Tech Stack:** Next.js 14 App Router + next-intl (web, Vitest), NestJS 10 + Prisma (api, Vitest), Expo SDK 51 / React Native (mobile, Jest), Turborepo + pnpm.

---

## Conventions & invariants (read before every task)

- **Isolation invariant (D3):** No authorization/scoping decision reads the `Host` header. The subdomain is branding + redirection only. The JWT `tenantId` claim is the sole data-scoping source. Any new code MUST preserve this.
- **No schema change (D7):** Zero Prisma migrations in Track 1. We reuse `Tenant.slug` (already `@unique`/indexed) and `tenant.slug` already exists on the auth `MeResponse` / web+mobile `AuthTenant` types (R2 resolved — verified in code).
- **Dormant by default:** All web behavior is gated by `ENABLE_SUBDOMAIN_RESOLVER` / `NEXT_PUBLIC_BASE_DOMAIN` / `NEXT_PUBLIC_ENABLE_SUBDOMAIN`, all unset in prod ⇒ current behavior is unchanged after merge.
- **Windows local validation:** `next build` / `vitest` / `jest` fail locally with `ERR_DLOPEN_FAILED` (native-binding block). Validate locally with **`type-check` + `lint` only**; full build + tests run in CI. Each "verify" step below reflects this.
- **Commits:** Conventional Commits, no attribution trailer. Stage specific files (never `git add -A`).
- **Checkpoint 🛑:** PR-2 touches the multi-tenant zone ⇒ mandatory security review before merge (Task 11).
- **Auto-merge:** When all CI checks are green, merge immediately (`gh pr merge <N> --merge`) — do not wait for explicit OK.
- **Package filters:** web = `@ecole-saas/web`, api = `@ecole-saas/api`, mobile = `@klasso/mobile`.

---

## File Structure

**PR-1 — API CORS wildcard + web CSP fix** (low risk, immediate value: also unblocks prod WebSocket messaging)
- Create: `apps/api/src/common/config/cors-origin.ts` — `KLASSO_SUBDOMAIN_RE` + `isAllowedOrigin(origin, allowlist)` pure matcher.
- Create: `apps/api/src/common/config/cors-origin.spec.ts` — unit tests for the matcher.
- Modify: `apps/api/src/main.ts:54-58` — CORS `origin` becomes a callback delegating to `isAllowedOrigin`.
- Modify: `apps/web/next.config.mjs:24` — CSP `connect-src` → real Railway host + `wss://` + `*.klasso.tn`.

**PR-2 — Web selective middleware + buildTenantUrl + cookie/guard** (🛑 multi-tenant; dormant until flags on)
- Create: `apps/web/lib/tenant/subdomain-rewrite.ts` — `BRANDED_PREAUTH_PREFIXES` + pure `resolveBrandedRewrite(...)`.
- Create: `apps/web/lib/tenant/__tests__/subdomain-rewrite.test.ts`.
- Modify: `apps/web/middleware.ts:6,36-49` — swap import; rewrite only branded pre-auth pages.
- Create: `apps/web/lib/tenant/build-tenant-url.ts` — `buildTenantUrl(slug, path)` canonical URL helper.
- Create: `apps/web/lib/tenant/__tests__/build-tenant-url.test.ts`.
- Modify: `apps/web/lib/auth/cookies.ts` — add `domain?` to `CookieOptions`, `subdomainCookieDomain()`, spread into `refreshCookieOptions()`.
- Create: `apps/web/lib/auth/__tests__/cookies.test.ts`.
- Create: `apps/web/lib/tenant/subdomain-consistency.ts` — pure `shouldRedirectForSlugMismatch(...)`.
- Create: `apps/web/lib/tenant/__tests__/subdomain-consistency.test.ts`.
- Modify: `apps/web/app/[locale]/(app)/app-shell-client.tsx` — slug-consistency guard `useEffect`.

**PR-3 — Mobile runtime tabs** (low risk, immediate value)
- Modify: `apps/mobile/lib/tabs.ts` — add `getTabsForRole(role)` (Task 12), then remove dead `getMobileTabs`/`Persona` (Task 13).
- Create: `apps/mobile/lib/__tests__/tabs.test.ts`.
- Modify: `apps/mobile/app/(app)/_layout.tsx` — render tabs from `useAuthStore` role.

---

## PR-1 — API CORS wildcard `*.klasso.tn` + fix web CSP

### Task 1: CORS origin matcher (`isAllowedOrigin`)

**Files:**
- Create: `apps/api/src/common/config/cors-origin.ts`
- Test: `apps/api/src/common/config/cors-origin.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/common/config/cors-origin.spec.ts
import { isAllowedOrigin } from './cors-origin';

describe('isAllowedOrigin', () => {
  const allowlist = ['https://klasso.tn', 'http://localhost:3000'];

  it('allows a valid tenant subdomain over https', () => {
    expect(isAllowedOrigin('https://ecole-victor-hugo.klasso.tn', allowlist)).toBe(true);
  });

  it('allows an origin present in the static allowlist', () => {
    expect(isAllowedOrigin('https://klasso.tn', allowlist)).toBe(true);
  });

  it('allows an undefined origin (server-to-server / curl)', () => {
    expect(isAllowedOrigin(undefined, allowlist)).toBe(true);
  });

  it('rejects an unrelated origin', () => {
    expect(isAllowedOrigin('https://evil.com', allowlist)).toBe(false);
  });

  it('rejects http (non-TLS) subdomains', () => {
    expect(isAllowedOrigin('http://ecole.klasso.tn', allowlist)).toBe(false);
  });

  it('rejects nested sub-subdomains', () => {
    expect(isAllowedOrigin('https://a.b.klasso.tn', allowlist)).toBe(false);
  });

  it('rejects look-alike suffixes', () => {
    expect(isAllowedOrigin('https://klasso.tn.attacker.com', allowlist)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api test -- cors-origin` (CI; locally blocked by `ERR_DLOPEN_FAILED`).
Expected: FAIL — `Cannot find module './cors-origin'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/common/config/cors-origin.ts
/**
 * V1.7-A — CORS origin matcher for tenant subdomains.
 *
 * Accepts the static allowlist (KLASSO_KNOWN_ORIGINS + CORS_ORIGIN env, built
 * by `buildCorsOrigins()` in configuration.ts) OR any `https://<label>.klasso.tn`
 * subdomain. The wildcard is deliberately narrow: https only, exactly one DNS
 * label, no nested sub-subdomains, no arbitrary suffix — so it can never match
 * `evil.com` or `klasso.tn.attacker.com`.
 *
 * Tenant isolation is NEVER derived from the Origin/Host (invariant D3). This
 * matcher only decides whether the browser may READ the CORS response; the JWT
 * `tenantId` claim remains the sole source of data scoping.
 */
export const KLASSO_SUBDOMAIN_RE =
  /^https:\/\/[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.klasso\.tn$/;

export function isAllowedOrigin(
  origin: string | undefined,
  allowlist: string[],
): boolean {
  if (!origin) return true; // same-origin / server-to-server / curl
  if (allowlist.includes(origin)) return true; // KLASSO_KNOWN_ORIGINS + CORS_ORIGIN
  return KLASSO_SUBDOMAIN_RE.test(origin); // <slug>.klasso.tn
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api test -- cors-origin` (CI).
Expected: PASS (7 cases).

- [ ] **Step 5: Local validation**

Run: `pnpm --filter=@ecole-saas/api type-check && pnpm --filter=@ecole-saas/api lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/config/cors-origin.ts apps/api/src/common/config/cors-origin.spec.ts
git commit -m "feat(api): add isAllowedOrigin matcher for *.klasso.tn CORS"
```

### Task 2: Wire the matcher into CORS bootstrap

**Files:**
- Modify: `apps/api/src/main.ts` (import after line 12; CORS block lines 54-58)

- [ ] **Step 1: Add the import**

Add directly after `import { AppModule } from './app.module';` (line 12):

```ts
import { isAllowedOrigin } from './common/config/cors-origin';
```

- [ ] **Step 2: Replace the CORS origin with a callback**

Replace this exact block (lines 54-58):

```ts
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });
```

with:

```ts
  app.enableCors({
    // Accept the static allowlist OR any https://<slug>.klasso.tn (D6). The
    // Host/Origin NEVER drives tenant isolation (D3) — this only gates CORS.
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin, corsOrigin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });
```

- [ ] **Step 3: Local validation**

Run: `pnpm --filter=@ecole-saas/api type-check && pnpm --filter=@ecole-saas/api lint`
Expected: no errors (the callback signature `(origin?: string, callback: (err: Error | null, allow?: boolean) => void) => void` matches `cors`'s `CustomOrigin`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(api): accept *.klasso.tn origins via CORS callback"
```

### Task 3: Fix web CSP `connect-src` (real API host + wss)

**Files:**
- Modify: `apps/web/next.config.mjs:24`

- [ ] **Step 1: Replace the stale connect-src line**

Replace this exact line (line 24):

```js
      "connect-src 'self' https://api-klasso.railway.app https://*.vercel.app https://o4505000000000000.ingest.sentry.io",
```

with:

```js
      "connect-src 'self' https://api.klasso.tn wss://api.klasso.tn https://*.klasso.tn wss://*.klasso.tn https://*.vercel.app https://o4505000000000000.ingest.sentry.io",
```

- [ ] **Step 2: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors (CSP is a plain string; type-check confirms the module still parses).

- [ ] **Step 3: Commit**

```bash
git add apps/web/next.config.mjs
git commit -m "fix(web): point CSP connect-src at the real Railway API host + wss"
```

### Task 4: Verify, open PR, auto-merge

- [ ] **Step 1: Full local validation (both packages)**

Run: `pnpm --filter=@ecole-saas/api type-check && pnpm --filter=@ecole-saas/api lint && pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: all green.

- [ ] **Step 2: Push + open PR**

```bash
git push -u origin feat/subdomain-per-tenant
gh pr create --title "feat: CORS *.klasso.tn + fix web CSP API host/wss (Track 1 PR-1)" --body "$(cat <<'EOF'
## Summary
- Add `isAllowedOrigin` matcher accepting the static allowlist OR `https://<slug>.klasso.tn` (narrow regex: https-only, single label).
- Wire it into `app.enableCors` as a callback (`credentials: true` preserved).
- Fix web CSP `connect-src`: point at the real Railway host `api.klasso.tn` (+ `wss://` for Socket.IO) and allow `*.klasso.tn`; drop the stale `api-klasso.railway.app`.

Dormant-safe: no behavior change for the apex `klasso.tn` (still in the static allowlist). Also fixes the production WebSocket messaging CSP block today.

Isolation invariant (D3) preserved: Host/Origin never scopes tenant data — JWT `tenantId` remains the sole source.

## Test plan
- [ ] CI: `isAllowedOrigin` unit tests pass (7 cases).
- [ ] CI: api + web type-check, lint, build green.
- [ ] Manual (post-deploy): browser console shows no CSP `connect-src` violation on `klasso.tn`; WS upgrades succeed.
EOF
)"
```

- [ ] **Step 2b: Self-review own diff before review**

Run: `gh pr diff` and read every hunk — confirm only the 4 intended files changed and the CSP string is exactly as specified.

- [ ] **Step 3: Wait for CI, then auto-merge**

```bash
gh pr checks --watch
gh pr merge --merge
```

Expected: all checks green → merged.

---

## PR-2 — Web selective middleware + `buildTenantUrl` + cookie/guard

> 🛑 This PR touches the multi-tenant zone. Task 11 runs a mandatory security review before merge.

### Task 5: Selective branded pre-auth rewrite resolver

**Files:**
- Create: `apps/web/lib/tenant/subdomain-rewrite.ts`
- Test: `apps/web/lib/tenant/__tests__/subdomain-rewrite.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/tenant/__tests__/subdomain-rewrite.test.ts
import { describe, expect, it } from 'vitest';
import { resolveBrandedRewrite } from '../subdomain-rewrite';

const LOCALES = ['fr', 'ar'] as const;
const base = { enabled: true, baseDomain: 'klasso.tn', locales: LOCALES };

describe('resolveBrandedRewrite', () => {
  it('rewrites a branded pre-auth page on a tenant subdomain', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/login' }),
    ).toBe('/fr/t/ecole/login');
  });

  it('passes through authenticated pages (no rewrite)', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/dashboard' }),
    ).toBeNull();
  });

  it('returns null when the resolver is disabled', () => {
    expect(
      resolveBrandedRewrite({ ...base, enabled: false, host: 'ecole.klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('returns null on the apex domain (no tenant subdomain)', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('returns null for a reserved subdomain label', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'www.klasso.tn', path: '/fr/login' }),
    ).toBeNull();
  });

  it('does not double-rewrite an already-branded path', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/t/ecole/login' }),
    ).toBeNull();
  });

  it('handles a path without a locale prefix', () => {
    expect(
      resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/login' }),
    ).toBe('/t/ecole/login');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/web test -- subdomain-rewrite` (CI).
Expected: FAIL — `Cannot find module '../subdomain-rewrite'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/lib/tenant/subdomain-rewrite.ts
import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';

/**
 * Pre-auth pages that carry tenant branding. On a tenant subdomain
 * (`<slug>.klasso.tn`) ONLY these are rewritten to the branded `/t/{slug}/...`
 * route group. Authenticated pages (/dashboard, the (app) group) pass through
 * untouched — their tenant comes from the JWT, never from the host (D3).
 */
export const BRANDED_PREAUTH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

export interface ResolveBrandedRewriteInput {
  host: string;
  path: string;
  enabled: boolean;
  baseDomain: string;
  locales: readonly string[];
}

/** Strip a leading `/{locale}` segment: `/fr/login` → `{ locale: 'fr', rest: '/login' }`. */
function splitLocale(
  path: string,
  locales: readonly string[],
): { locale: string; rest: string } {
  for (const locale of locales) {
    if (path === `/${locale}`) return { locale, rest: '/' };
    if (path.startsWith(`/${locale}/`)) {
      return { locale, rest: path.slice(locale.length + 1) };
    }
  }
  return { locale: '', rest: path };
}

/**
 * Decide whether a request on a tenant subdomain must be rewritten to the
 * branded `/t/{slug}` route. Returns the target pathname, or null to pass
 * through unchanged. Pure function — no `next/server` dependency, unit-testable.
 */
export function resolveBrandedRewrite(
  input: ResolveBrandedRewriteInput,
): string | null {
  if (!input.enabled) return null;
  const slug = extractTenantSlugFromHost(input.host, input.baseDomain);
  if (!slug) return null;

  const { locale, rest } = splitLocale(input.path, input.locales);
  const isBrandedPreauth = BRANDED_PREAUTH_PREFIXES.some(
    (p) => rest === p || rest.startsWith(`${p}/`),
  );
  if (!isBrandedPreauth) return null; // authed pages → passthrough (tenant via JWT)
  if (rest.startsWith(`/t/${slug}`)) return null; // already branded

  return locale ? `/${locale}/t/${slug}${rest}` : `/t/${slug}${rest}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/web test -- subdomain-rewrite` (CI).
Expected: PASS (7 cases).

- [ ] **Step 5: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/tenant/subdomain-rewrite.ts apps/web/lib/tenant/__tests__/subdomain-rewrite.test.ts
git commit -m "feat(web): add selective branded pre-auth rewrite resolver"
```

### Task 6: Use the resolver in the middleware (fix the 404 bug)

**Files:**
- Modify: `apps/web/middleware.ts` (import line 6; rewrite block lines 36-49)

- [ ] **Step 1: Swap the import**

Replace this exact line (line 6):

```ts
import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';
```

with:

```ts
import { resolveBrandedRewrite } from '@/lib/tenant/subdomain-rewrite';
```

(`extractTenantSlugFromHost` is now used inside `subdomain-rewrite.ts`, not the middleware. `stripLocale` stays — it is still used by the auth-redirect logic below.)

- [ ] **Step 2: Replace the rewrite block**

Replace this exact block (lines 36-49):

```ts
  // V1.7-A — Subdomain resolver (dormant, gated by ENABLE_SUBDOMAIN_RESOLVER).
  if (SUBDOMAIN_RESOLVER_ENABLED) {
    const slug = extractTenantSlugFromHost(host, BASE_DOMAIN);
    if (slug) {
      const stripped = stripLocale(path);
      if (!stripped.startsWith(`/t/${slug}`)) {
        const url = request.nextUrl.clone();
        const localeMatch = path.match(/^\/(fr|ar)(\/|$)/);
        const locale = localeMatch ? localeMatch[1] : '';
        url.pathname = locale ? `/${locale}/t/${slug}${stripped}` : `/t/${slug}${stripped}`;
        return NextResponse.rewrite(url);
      }
    }
  }
```

with:

```ts
  // V1.7-A — Subdomain resolver (dormant, gated by ENABLE_SUBDOMAIN_RESOLVER).
  // Selective: ONLY branded pre-auth pages are rewritten to /t/{slug}. Authed
  // pages (/dashboard, the (app) group) pass through — tenant comes from the
  // JWT, never the Host (D3). Fixes the "rewrite everything → 404" bug.
  if (SUBDOMAIN_RESOLVER_ENABLED) {
    const target = resolveBrandedRewrite({
      host,
      path,
      enabled: SUBDOMAIN_RESOLVER_ENABLED,
      baseDomain: BASE_DOMAIN,
      locales,
    });
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.rewrite(url);
    }
  }
```

- [ ] **Step 3: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors, and **no "unused import" warning** for `extractTenantSlugFromHost` (it was removed). `locales` is already imported (line 4) and `stripLocale` is still referenced below.

- [ ] **Step 4: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "fix(web): rewrite only branded pre-auth pages on tenant subdomains"
```

### Task 7: `buildTenantUrl` canonical URL helper

**Files:**
- Create: `apps/web/lib/tenant/build-tenant-url.ts`
- Test: `apps/web/lib/tenant/__tests__/build-tenant-url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/tenant/__tests__/build-tenant-url.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTenantUrl } from '../build-tenant-url';

describe('buildTenantUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds a subdomain URL when subdomain mode is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    expect(buildTenantUrl('ecole', '/dashboard')).toBe('https://ecole.klasso.tn/dashboard');
  });

  it('falls back to path mode when subdomain mode is disabled', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://klasso.tn');
    expect(buildTenantUrl('ecole', '/dashboard')).toBe('https://klasso.tn/t/ecole/dashboard');
  });

  it('falls back to path mode when the base domain is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', '');
    vi.stubEnv('NEXT_PUBLIC_WEB_URL', 'https://klasso.tn');
    expect(buildTenantUrl('ecole', '/dashboard')).toBe('https://klasso.tn/t/ecole/dashboard');
  });

  it('defaults the path to root', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    expect(buildTenantUrl('ecole')).toBe('https://ecole.klasso.tn/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/web test -- build-tenant-url` (CI).
Expected: FAIL — `Cannot find module '../build-tenant-url'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/lib/tenant/build-tenant-url.ts
/**
 * Canonical URL for a tenant, per the active routing mode.
 *
 * - Subdomain mode (NEXT_PUBLIC_ENABLE_SUBDOMAIN=true + NEXT_PUBLIC_BASE_DOMAIN
 *   set): `https://<slug>.<base><path>`.
 * - Path mode (default / preview / apex): `<web-url>/t/<slug><path>`.
 *
 * Used for post-login redirects and cross-tenant links. The API's outbound
 * email links already build `/t/{slug}` from `webAppUrl` and are unchanged.
 */
export function buildTenantUrl(slug: string, path = '/'): string {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true';
  if (enabled && base) {
    return `https://${slug}.${base}${path}`;
  }
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? 'https://klasso.tn';
  return `${webUrl}/t/${slug}${path}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/web test -- build-tenant-url` (CI).
Expected: PASS (4 cases).

- [ ] **Step 5: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/tenant/build-tenant-url.ts apps/web/lib/tenant/__tests__/build-tenant-url.test.ts
git commit -m "feat(web): add buildTenantUrl canonical URL helper"
```

### Task 8: Share the refresh cookie across `.klasso.tn`

**Files:**
- Modify: `apps/web/lib/auth/cookies.ts`
- Test: `apps/web/lib/auth/__tests__/cookies.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/auth/__tests__/cookies.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshCookieOptions, subdomainCookieDomain } from '../cookies';

describe('subdomainCookieDomain', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns `.<base>` in subdomain mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'true');
    vi.stubEnv('NEXT_PUBLIC_BASE_DOMAIN', 'klasso.tn');
    expect(subdomainCookieDomain()).toBe('.klasso.tn');
  });

  it('returns undefined in path mode (host-only cookie)', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    expect(subdomainCookieDomain()).toBeUndefined();
  });

  it('omits the domain from refresh cookie options in path mode', () => {
    vi.stubEnv('NEXT_PUBLIC_ENABLE_SUBDOMAIN', 'false');
    expect(refreshCookieOptions().domain).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/web test -- cookies` (CI).
Expected: FAIL — `subdomainCookieDomain` is not exported.

- [ ] **Step 3: Add the `domain` field to the interface**

Replace this exact block in `apps/web/lib/auth/cookies.ts` (lines 8-14):

```ts
export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}
```

with:

```ts
export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
  /** V1.7-A — `.klasso.tn` in subdomain mode so the refresh cookie is shared
   *  across every `<slug>.klasso.tn`. Omitted (host-only) otherwise. */
  domain?: string;
}
```

- [ ] **Step 4: Add the helper and spread it into the options**

Replace this exact block (lines 22-30 — the `refreshCookieOptions` function):

```ts
export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  };
}
```

with:

```ts
/**
 * Cookie `Domain` attribute. In subdomain mode the refresh cookie must be
 * readable on every `<slug>.klasso.tn`, so we scope it to `.<base>`. In path
 * mode (apex / Vercel preview) we return undefined → host-only cookie (R1: a
 * `.klasso.tn` domain cookie would not apply on `*.vercel.app` anyway).
 */
export function subdomainCookieDomain(): string | undefined {
  const base = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  const enabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true';
  return enabled && base ? `.${base}` : undefined;
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    domain: subdomainCookieDomain(),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/web test -- cookies` (CI).
Expected: PASS (3 cases). `setRefreshCookie` / `clearRefreshCookie` consume `refreshCookieOptions()` unchanged; `domain: undefined` is a no-op for `response.cookies.set`.

- [ ] **Step 6: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/auth/cookies.ts apps/web/lib/auth/__tests__/cookies.test.ts
git commit -m "feat(web): share refresh cookie across .klasso.tn in subdomain mode"
```

### Task 9: Slug-consistency guard helper

**Files:**
- Create: `apps/web/lib/tenant/subdomain-consistency.ts`
- Test: `apps/web/lib/tenant/__tests__/subdomain-consistency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/tenant/__tests__/subdomain-consistency.test.ts
import { describe, expect, it } from 'vitest';
import { shouldRedirectForSlugMismatch } from '../subdomain-consistency';

const base = { enabled: true, baseDomain: 'klasso.tn' };

describe('shouldRedirectForSlugMismatch', () => {
  it('redirects when host slug != JWT slug', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'ecole-a.klasso.tn', jwtSlug: 'ecole-b' }),
    ).toBe(true);
  });

  it('does not redirect when host slug matches JWT slug', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'ecole-a.klasso.tn', jwtSlug: 'ecole-a' }),
    ).toBe(false);
  });

  it('does not redirect on the apex domain (path mode)', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'klasso.tn', jwtSlug: 'ecole-a' }),
    ).toBe(false);
  });

  it('does not redirect when the resolver is disabled', () => {
    expect(
      shouldRedirectForSlugMismatch({
        ...base,
        enabled: false,
        host: 'ecole-a.klasso.tn',
        jwtSlug: 'ecole-b',
      }),
    ).toBe(false);
  });

  it('does not redirect when the session has no tenant slug', () => {
    expect(
      shouldRedirectForSlugMismatch({ ...base, host: 'ecole-a.klasso.tn', jwtSlug: undefined }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/web test -- subdomain-consistency` (CI).
Expected: FAIL — `Cannot find module '../subdomain-consistency'`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/web/lib/tenant/subdomain-consistency.ts
import { extractTenantSlugFromHost } from '@/lib/tenant/extract-tenant-slug';

export interface SlugConsistencyInput {
  host: string;
  /** `tenant.slug` from the JWT-backed session (/auth/me). */
  jwtSlug: string | undefined;
  enabled: boolean;
  baseDomain: string;
}

/**
 * UX guard (NOT an isolation control). On a tenant subdomain, if the host slug
 * disagrees with the session's tenant slug, the branded shell would mislead the
 * user. Returns true → caller should log out and redirect to the correct host.
 * Real isolation is always enforced by the JWT `tenantId` (D3), so bypassing
 * this guard leaks nothing — it only protects against a confusing shell.
 */
export function shouldRedirectForSlugMismatch(
  input: SlugConsistencyInput,
): boolean {
  if (!input.enabled) return false;
  if (!input.jwtSlug) return false;
  const hostSlug = extractTenantSlugFromHost(input.host, input.baseDomain);
  if (!hostSlug) return false; // apex / preview → path mode, nothing to compare
  return hostSlug !== input.jwtSlug;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/web test -- subdomain-consistency` (CI).
Expected: PASS (5 cases).

- [ ] **Step 5: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/tenant/subdomain-consistency.ts apps/web/lib/tenant/__tests__/subdomain-consistency.test.ts
git commit -m "feat(web): add subdomain slug-consistency guard helper"
```

### Task 10: Wire the consistency guard into the app shell

**Files:**
- Modify: `apps/web/app/[locale]/(app)/app-shell-client.tsx` (imports after line 13; new `useEffect` after line 49)

- [ ] **Step 1: Add the imports**

Add directly after `import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';` (line 13):

```ts
import { buildTenantUrl } from '@/lib/tenant/build-tenant-url';
import { shouldRedirectForSlugMismatch } from '@/lib/tenant/subdomain-consistency';
```

- [ ] **Step 2: Insert the guard effect**

Insert directly after the refresh `useEffect` that ends on line 49 (`}, [isHydrated, accessToken, setSession, clear, router]);`) and before `const brand: TenantBrand = useMemo(...)`:

```ts
  // V1.7-A — Subdomain<->JWT slug consistency (UX guard; isolation stays on the
  // JWT, D3). If the branded host disagrees with the session tenant, log out and
  // bounce to the correct host. No-op in path mode / on the apex / when disabled.
  useEffect(() => {
    if (!isHydrated || !tenant?.slug) return;
    const jwtSlug = tenant.slug;
    const mismatch = shouldRedirectForSlugMismatch({
      host: window.location.host,
      jwtSlug,
      enabled: process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true',
      baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn',
    });
    if (!mismatch) return;
    logout()
      .catch(() => undefined)
      .finally(() => {
        clear();
        window.location.assign(buildTenantUrl(jwtSlug, '/dashboard'));
      });
  }, [isHydrated, tenant?.slug, clear]);
```

- [ ] **Step 3: Local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: no errors. `logout` is already imported (line 11), `clear` + `tenant` + `isHydrated` are existing store selectors. `react-hooks/exhaustive-deps`: deps are `[isHydrated, tenant?.slug, clear]` — `logout`, `buildTenantUrl`, `shouldRedirectForSlugMismatch` are module-scope stable. If lint flags the member-expression dep, keep it (it is correct and intentional).

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/(app)/app-shell-client.tsx"
git commit -m "feat(web): enforce subdomain-JWT slug consistency in app shell"
```

### Task 11: Security review (🛑), verify, open PR, auto-merge

- [ ] **Step 1: Dispatch the security review**

Use the `security-reviewer` agent on the PR-2 diff. Focus prompt: "Confirm invariant D3 — no code path uses `Host`/subdomain for tenant data scoping; the cookie carries only a slug (no secret), is Secure+SameSite=Lax, domain `.klasso.tn` only in subdomain mode; the consistency guard is UX-only and a bypass leaks no cross-tenant data because the JWT `tenantId` still scopes every query. Check the CORS callback isn't reachable as an isolation bypass." Address any CRITICAL/HIGH before proceeding.

- [ ] **Step 2: Full local validation**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint`
Expected: all green.

- [ ] **Step 3: Push + open PR**

```bash
git push
gh pr create --title "feat: selective subdomain middleware + cookie/guard (Track 1 PR-2)" --body "$(cat <<'EOF'
## Summary
- Middleware now rewrites ONLY branded pre-auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`) to `/t/{slug}` on a tenant subdomain. `/dashboard` and the (app) group pass through — fixes the "rewrite everything → 404 on authed pages" bug.
- `buildTenantUrl(slug, path)` canonical URL helper (subdomain mode vs path mode).
- Refresh cookie scoped to `.klasso.tn` in subdomain mode (shared cross-subdomain); host-only otherwise.
- Client slug-consistency guard in the app shell: logs out + redirects if the branded host disagrees with the JWT tenant slug.

Dormant-safe: gated by `ENABLE_SUBDOMAIN_RESOLVER` / `NEXT_PUBLIC_ENABLE_SUBDOMAIN` / `NEXT_PUBLIC_BASE_DOMAIN` (all unset in prod ⇒ unchanged).

## Isolation (D3)
Host/subdomain is cosmetic only. Tenant data scoping stays on the JWT `tenantId`. The guard is UX-only; a bypass leaks nothing. Security-reviewer pass attached.

## Test plan
- [ ] CI: resolveBrandedRewrite (7), buildTenantUrl (4), subdomainCookieDomain (3), shouldRedirectForSlugMismatch (5) pass.
- [ ] CI: web type-check, lint, build green.
- [ ] Manual (post-DNS, separate): `ecole.klasso.tn/login` → branding; `ecole.klasso.tn/dashboard` → no 404; logging in as tenant B on tenant A's host → bounced to B's host.
EOF
)"
```

- [ ] **Step 3b: Self-review own diff**

Run: `gh pr diff` — confirm only the intended files changed; no stray edits; the middleware no longer imports `extractTenantSlugFromHost`.

- [ ] **Step 4: Wait for CI, then auto-merge**

```bash
gh pr checks --watch
gh pr merge --merge
```

Expected: all checks green → merged.

---

## PR-3 — Mobile runtime tabs (`getTabsForRole`)

### Task 12: Add the runtime role→tabs resolver

**Files:**
- Modify: `apps/mobile/lib/tabs.ts` (add import + role constants + `getTabsForRole`; keep `getMobileTabs` for now)
- Test: `apps/mobile/lib/__tests__/tabs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/mobile/lib/__tests__/tabs.test.ts
import { getTabsForRole } from '../tabs';

describe('getTabsForRole', () => {
  it('returns admin tabs for SCHOOL_ADMIN', () => {
    expect(getTabsForRole('SCHOOL_ADMIN').map((t) => t.name)).toEqual([
      'dashboard', 'students', 'classes', 'pedagogy', 'notifications', 'profile',
    ]);
  });

  it('returns teacher tabs for TEACHER', () => {
    expect(getTabsForRole('TEACHER').map((t) => t.name)).toEqual([
      'dashboard', 'classes', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns parent tabs for PARENT', () => {
    expect(getTabsForRole('PARENT').map((t) => t.name)).toEqual([
      'dashboard', 'students', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns minimal tabs for STAFF', () => {
    expect(getTabsForRole('STAFF').map((t) => t.name)).toEqual([
      'dashboard', 'messages', 'notifications', 'profile',
    ]);
  });

  it('returns minimal tabs for SUPER_ADMIN', () => {
    expect(getTabsForRole('SUPER_ADMIN').map((t) => t.name)).toEqual([
      'dashboard', 'messages', 'notifications', 'profile',
    ]);
  });

  it('always ends with the profile tab', () => {
    (['SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STAFF', 'SUPER_ADMIN'] as const).forEach((role) => {
      const tabs = getTabsForRole(role);
      expect(tabs[tabs.length - 1].name).toBe('profile');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@klasso/mobile test -- tabs` (CI).
Expected: FAIL — `getTabsForRole` is not exported.

- [ ] **Step 3: Add the import**

Add directly under the existing `type Persona = ...` line (line 1) of `apps/mobile/lib/tabs.ts`:

```ts
import type { UserRole } from '@/lib/auth/types';
```

- [ ] **Step 4: Append the role constants + resolver**

Append to the END of `apps/mobile/lib/tabs.ts` (after the closing brace of `getMobileTabs`, line 46):

```ts

const ADMIN_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Tableau' },
  { name: 'students', label: 'Élèves' },
  { name: 'classes', label: 'Classes' },
  { name: 'pedagogy', label: 'Pédagogie' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

const TEACHER_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Accueil' },
  { name: 'classes', label: 'Mes classes' },
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

const PARENT_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Accueil' },
  { name: 'students', label: 'Mon enfant' },
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

/** STAFF + SUPER_ADMIN: minimal, role-agnostic set — all screens already exist. */
const MINIMAL_TABS: MobileTab[] = [
  { name: 'dashboard', label: 'Accueil' },
  { name: 'messages', label: 'Messages' },
  { name: 'notifications', label: 'Notifs' },
  { name: 'profile', label: 'Profil' },
];

/**
 * V1.7-A — Resolve the bottom tab bar from the connected user's role at
 * RUNTIME (replaces the build-time EXPO_PUBLIC_PERSONA selection). One binary
 * serves all three personas; tabs always match the role carried by the JWT.
 */
export function getTabsForRole(role: UserRole): MobileTab[] {
  switch (role) {
    case 'SCHOOL_ADMIN':
      return ADMIN_TABS;
    case 'TEACHER':
      return TEACHER_TABS;
    case 'PARENT':
      return PARENT_TABS;
    case 'STAFF':
    case 'SUPER_ADMIN':
    default:
      return MINIMAL_TABS;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=@klasso/mobile test -- tabs` (CI).
Expected: PASS (6 cases). All tab `name`s map to existing screens under `app/(app)/` (dashboard, students, classes, pedagogy, messages, notifications, profile).

- [ ] **Step 6: Local validation**

Run: `pnpm --filter=@klasso/mobile type-check && pnpm --filter=@klasso/mobile lint`
Expected: no errors. (`getMobileTabs` still present and still used by `_layout.tsx` ⇒ build stays green this commit.)

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/lib/tabs.ts apps/mobile/lib/__tests__/tabs.test.ts
git commit -m "feat(mobile): add runtime getTabsForRole resolver"
```

### Task 13: Render tabs from the connected role + remove dead build-time path

**Files:**
- Modify: `apps/mobile/app/(app)/_layout.tsx` (imports + tab source)
- Modify: `apps/mobile/lib/tabs.ts` (remove now-unused `Persona` type + `getMobileTabs`)

- [ ] **Step 1: Update the layout imports**

Replace this exact block at the top of `apps/mobile/app/(app)/_layout.tsx` (lines 1-5):

```ts
import { Tabs } from 'expo-router';

import { colors } from '@klasso/ui-mobile';
import { getMobileTabs } from '@/lib/tabs';
import { useUnreadCount } from '@/lib/api/notifications';
```

with:

```ts
import { Tabs } from 'expo-router';

import { colors } from '@klasso/ui-mobile';
import { getTabsForRole } from '@/lib/tabs';
import { useUnreadCount } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/auth/store';
```

- [ ] **Step 2: Resolve tabs from the role**

Replace this exact line (line 8):

```ts
  const tabs = getMobileTabs();
```

with:

```ts
  const role = useAuthStore((s) => s.user?.role);
  const tabs = getTabsForRole(role ?? 'STAFF');
```

(`role` falls back to `'STAFF'` → MINIMAL_TABS while the session is still hydrating; the post-login store update re-renders with the real role.)

- [ ] **Step 3: Remove the dead build-time path from tabs.ts**

Delete the now-unused `type Persona = 'parent' | 'teacher' | 'admin';` line (line 1) and the entire `getMobileTabs` function (the JSDoc block + function, originally lines 9-46). Keep the `UserRole` import, the `MobileTab` interface, the four role-tab constants, and `getTabsForRole`.

After this edit, the top of `apps/mobile/lib/tabs.ts` reads:

```ts
import type { UserRole } from '@/lib/auth/types';

export interface MobileTab {
  /** Route name relative to `app/(app)/` — must match a .tsx file. */
  name: string;
  label: string;
}

const ADMIN_TABS: MobileTab[] = [
```

- [ ] **Step 4: Local validation**

Run: `pnpm --filter=@klasso/mobile type-check && pnpm --filter=@klasso/mobile lint`
Expected: no errors. No remaining reference to `getMobileTabs` or `EXPO_PUBLIC_PERSONA` (grep to confirm: `git grep -n "getMobileTabs\|EXPO_PUBLIC_PERSONA" apps/mobile` returns nothing).

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(app)/_layout.tsx" apps/mobile/lib/tabs.ts
git commit -m "feat(mobile): render tabs from connected role at runtime"
```

### Task 14: Verify, open PR, auto-merge

- [ ] **Step 1: Full local validation**

Run: `pnpm --filter=@klasso/mobile type-check && pnpm --filter=@klasso/mobile lint`
Expected: all green.

- [ ] **Step 2: Push + open PR**

```bash
git push
gh pr create --title "feat: mobile runtime tabs by role (Track 1 PR-3)" --body "$(cat <<'EOF'
## Summary
- Add `getTabsForRole(role)` resolving the bottom tab bar from the connected user's role at runtime.
- `app/(app)/_layout.tsx` reads `useAuthStore((s) => s.user?.role)` and renders the matching tabs.
- Remove the dead build-time `EXPO_PUBLIC_PERSONA` selection (`getMobileTabs` + `Persona`).

One binary serves Parent / Teacher / Direction; tabs always match the JWT role (fixes the build-flag-vs-role contradiction). STAFF + SUPER_ADMIN get a minimal set (dashboard, messages, notifications, profile) — every screen already exists.

## Test plan
- [ ] CI: getTabsForRole unit tests pass (6 cases).
- [ ] CI: mobile type-check, lint, (jest) green.
- [ ] Manual: log in as each persona → tab bar matches the role.
EOF
)"
```

- [ ] **Step 2b: Self-review own diff**

Run: `gh pr diff` — confirm only `tabs.ts` + `_layout.tsx` + the test changed; `getMobileTabs` fully removed.

- [ ] **Step 3: Wait for CI, then auto-merge**

```bash
gh pr checks --watch
gh pr merge --merge
```

Expected: all checks green → merged.

---

## Out of scope (do NOT do in Track 1)

- ❌ Arbitrary custom domains (`monecole.com`) — only `*.klasso.tn`.
- ❌ Tenant resolution from `Host` (D3 — never).
- ❌ 3 separate mobile binaries per school (D1 — shared binary).
- ❌ Any Prisma migration / schema change (D7).
- ❌ **DNS activation** (wildcard CNAME, Vercel domain, env flags) — gated, separate runbook `docs/superpowers/runbooks/v1.7-b-dns-activation.md` + ADR 0007.
- ❌ Track 2 (CRUD remediation + missing modules) — its own spec + plan.

## Post-merge note (activation is a separate, gated step)

All three PRs merge **dormant** (flags unset ⇒ current behavior). Activation follows the DNS runbook: OVH wildcard `*.klasso.tn → cname.vercel-dns.com` (blocked on the email migration — ADR 0007), `vercel domains add *.klasso.tn`, then set `ENABLE_SUBDOMAIN_RESOLVER=true` / `NEXT_PUBLIC_BASE_DOMAIN=klasso.tn` / `NEXT_PUBLIC_ENABLE_SUBDOMAIN=true` and redeploy. `.tn` propagation: 24-72h.

---

## Self-Review

**1. Spec coverage** (each spec section → task):
- §5.1 selective middleware → Tasks 5-6 ✓
- §5.2 `buildTenantUrl` → Task 7 ✓
- §5.3 cookie `.klasso.tn` + consistency guard → Tasks 8-10 (R2 already satisfied: `tenant.slug` is on the auth `MeResponse` / `AuthTenant` types, verified) ✓
- §5.4 CORS wildcard `isAllowedOrigin` → Tasks 1-2 ✓
- §5.5 CSP fix → Task 3 ✓
- §5.6 mobile `getTabsForRole` → Tasks 12-13 ✓
- §7 tests → unit tests in every task; isolation regression test is an existing critical test (unchanged, re-run in CI) ✓
- §9 three-PR split → PR-1 (Tasks 1-4), PR-2 (Tasks 5-11), PR-3 (Tasks 12-14) ✓
- §6 security → Task 11 security-reviewer gate ✓

**2. Placeholder scan:** No TBD/TODO. Every code step shows complete code; every test step shows full test bodies; every command is concrete with expected output.

**3. Type consistency:** `MobileTab` reused from existing interface; `UserRole` imported from `@/lib/auth/types` (web) and `@/lib/auth/types` (mobile) — both define the same 5-member union; `resolveBrandedRewrite` input/return shapes match the middleware call site; `CookieOptions.domain?: string` matches `subdomainCookieDomain(): string | undefined`; `shouldRedirectForSlugMismatch` consumes `tenant?.slug` (`string | undefined`) matching the store.

**Documented minor deviation from the spec:** the matcher lives in a new `apps/api/src/common/config/cors-origin.ts` (same directory) rather than inside `configuration.ts`, for separation of concerns and unit-testability without booting the config module. Functionally identical to §5.4.
