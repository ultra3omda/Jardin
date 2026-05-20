# ADR 0001 — Auth strategy and multi-tenant isolation

**Status:** Accepted
**Date:** 2026-05-20
**Wave:** 1

## Context

Vague 1 needed an authentication system that:

- Identifies users belonging to a specific tenant (école)
- Issues short-lived access tokens + refresh tokens with rotation
- Prevents any data leakage between tenants at the query level
- Stays compatible with future SSO/OAuth additions (Vague 10+)
- Respects CLAUDE.md's non-negotiables: TypeScript strict, 70%+ test
  coverage, bcrypt rounds ≥ 12, JWT secrets ≥ 256 bits, no secrets in
  source, no PII in logs

## Decisions

### 1. JWT signing algorithm — HS256

Chosen for MVP simplicity. Single shared secret (`JWT_ACCESS_SECRET`)
on the API side, validated at startup to be ≥ 32 chars (≥ 256 bits).

**Tradeoff**: API replicas must share the secret. For Vague 11 hardening
we'll migrate to RS256 (asymmetric) so frontends and gateways can verify
signatures without holding the signing key.

### 2. Access token 15 min, refresh token 30 days

- **Access token** carries the full session context:
  `{ sub, email, tenantId, role }`. Cannot be revoked before expiry — that's
  the standard JWT tradeoff. 15 min limits the blast radius.
- **Refresh token** is a 256-bit random value
  (`randomBytes(32).toString('base64url')`), stored in DB as SHA-256 hash.
  Plaintext exists only in the response body and the client's httpOnly
  cookie — never in our database, never in logs (Pino redacts
  `*.refreshToken`, cookies, and authorization headers).

### 3. Refresh token rotation with reuse detection

Every `/auth/refresh` rotates the token in a single transaction:

1. New refresh token created with a fresh `cuid2 id`
2. Old refresh token marked `revokedAt = now()` and
   `replacedByTokenId = newId`

If a request later presents a refresh token whose `revokedAt` is already
set, we assume the token was stolen (the legitimate client moved to its
replacement). **Defense**: revoke the entire user's refresh chain via
`updateMany where userId and revokedAt IS NULL`. Logged as
`auth.token_reuse_detected` audit entry with the offending refresh token
id. This follows OAuth 2.0 Security BCP draft-30 §4.13.

### 4. Password hashing — bcrypt rounds 12

CLAUDE.md baseline. ~250 ms per hash on modern hardware. Configurable
via `BCRYPT_ROUNDS` (env-validated to 10–15 range) so future hardware
permits raising it.

### 5. IDs — cuid2 (not cuid v1, not UUID)

Generated in code via `@paralleldrive/cuid2` (`createId()`); Prisma
schema declares `id String @id` without `@default()`.

- Prisma's `@default(cuid())` is cuid v1 — k-sorted, leaks creation time
- UUID v4 is fine but longer, and Prisma's `@default(uuid())` is v4
- cuid2 is shorter, full-random, no info leak — CLAUDE.md mandates it

### 6. Email uniqueness — per tenant

`@@unique([tenantId, email])` composite unique constraint, not a global
unique on `email`. Rationale: a parent can have children in multiple
schools; each school has its own User row with the same email.

### 7. Multi-tenant isolation — Prisma extension + AsyncLocalStorage

- A NestJS `TenantContextService` wraps AsyncLocalStorage, populated by
  a global `TenantContextInterceptor` from the JWT
  `tenantId`/`role`/`userId`.
- A Prisma client extension (`createTenantExtension`) auto-injects
  `where: { tenantId }` on **read** queries and **bulk update/delete**
  queries against tenant-scoped models (User, RefreshToken, AuditLog).
- `findUnique` / `findUniqueOrThrow` / `update` (by unique where) /
  `delete` (by unique where) are **not** rewritten — would break Prisma's
  unique semantics. Code review enforces using `findFirst` for
  tenant-aware lookups.

**Verified by** `apps/api/test/multi-tenant-isolation.e2e-spec.ts` (8
scenarios including the SUPER_ADMIN bypass and cross-tenant
read/update/delete attempts). This is THE critical test of the wave.

### 8. SUPER_ADMIN login NOT supported in Vague 1

Schema constraint: `RefreshToken.tenantId` is NOT NULL. Super admins
have `User.tenantId = NULL`. Therefore they cannot currently hold
refresh tokens, hence cannot log in via `/auth/login`.

Vague 10 (Admin SaaS) will introduce either:

- A separate auth flow for platform admins (e.g. `/admin/auth/*`), or
- Make `RefreshToken.tenantId` nullable + adapt the multi-tenant
  extension

The seed already creates a super_admin row (`superadmin@ecole-saas.test`)
so the groundwork is in place. `/auth/login` returns the explicit error
code `SUPER_ADMIN_LOGIN_NOT_SUPPORTED` if attempted.

### 9. Web — refresh token in httpOnly cookie via Next.js Route Handler

Browser JavaScript never touches the refresh token (XSS-safe). A
catch-all Route Handler at `/api/auth/[...action]` proxies all auth
calls to the NestJS API and manages the cookie:

- `httpOnly: true`
- `secure: true` in production
- `sameSite: 'lax'`
- `maxAge: 30 days` (matches the API's `JWT_REFRESH_EXPIRES_IN`)

The browser only sees `{ accessToken, user, tenant }`. The access token
lives in memory via Zustand store — gone on full reload. On reload the
`/dashboard` layout silently calls `/api/auth/refresh` to restore the
session from the cookie.

### 10. No SSO / OAuth / passkeys in Vague 1

Deferred to Vague 10+ per scope. Vague 1.5 will add password reset via
email (Resend) and email verification.

## Consequences

**Positive:**

- Strict tenant isolation enforced at the query layer (defense in depth
  on top of FK constraints)
- Refresh token theft detected automatically
- httpOnly cookies eliminate the XSS attack surface for refresh tokens

**Negative:**

- Single shared HS256 secret — manual rotation only for now
- SUPER_ADMIN auth flow incomplete
- Refresh-chain wipe on suspected reuse may inconvenience legitimate
  users if a network race occurs (very rare in practice)

## References

- [OAuth 2.0 Security Best Current Practice (draft-30)](https://datatracker.ietf.org/doc/draft-ietf-oauth-security-topics/)
- [NIST SP 800-63B-3 — Memorized Secret Verifiers](https://pages.nist.gov/800-63-3/sp800-63b.html#sec5)
- [@paralleldrive/cuid2](https://github.com/paralleldrive/cuid2)
- [Prisma client extensions](https://www.prisma.io/docs/orm/prisma-client/client-extensions)
- [OWASP Cheat Sheet — JWT](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
