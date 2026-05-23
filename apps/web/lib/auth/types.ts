/**
 * Web-side mirror of the API's auth DTOs. We don't import them from the
 * API package because Prisma generates them and we don't want the web
 * to depend on Prisma. Keep these in sync with apps/api/src/auth/dto/.
 */

export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STAFF';
export type Locale = 'fr' | 'en' | 'ar' | 'es';
export type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';

export interface AuthUser {
  id: string;
  tenantId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locale: Locale;
}

/**
 * V1.6 — Loose shape for the brand JSON field. The API returns either a
 * partial brand (Record<string, unknown>) or a fully-merged TenantBrand
 * (when served via getMeFromCookies which merges over DEFAULT_BRAND).
 * Either shape extends Record<string, unknown> structurally.
 */
export type AuthTenantBrand = Record<string, unknown> | null;

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  locale: Locale;
  timezone: string;
  /** V1.6 — TenantBrand JSON (raw partial from API or fully merged from server-client).
   *  Pre-auth flows merge it over DEFAULT_BRAND before consuming. */
  brand: AuthTenantBrand;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenant: AuthTenant | null;
}

/** What the web sends to the browser — refresh token stripped out. */
export interface AuthSessionResponse {
  accessToken: string;
  user: AuthUser;
  tenant: AuthTenant | null;
}

export interface MeResponse {
  user: AuthUser;
  tenant: AuthTenant | null;
}
