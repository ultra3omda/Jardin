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

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  locale: Locale;
  timezone: string;
  /** V1.6 — partial TenantBrand JSON (null = use DEFAULT_BRAND).
   *  Web callers should merge it over DEFAULT_BRAND before consuming. */
  brand: Record<string, unknown> | null;
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
