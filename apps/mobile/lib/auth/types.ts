/**
 * Mobile-side mirror of the API's auth DTOs. We don't import them from the
 * API package because Prisma generates them and we don't want the mobile
 * app to depend on Prisma. Keep these in sync with apps/api/src/auth/dto/.
 *
 * NOTE: contrary to apps/web/lib/auth/types.ts which strips `refreshToken`
 * (because the web stores it in an httpOnly cookie via Next Route Handlers),
 * the mobile app receives the refresh token in the JSON body and stores it
 * in expo-secure-store. So `AuthSessionResponse` mobile-side includes it.
 */

import type { TenantBrand } from '@ecole-saas/shared';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMMERCIAL'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | 'PARENT'
  | 'STAFF';
export type Locale = 'fr' | 'en' | 'ar' | 'es';
export type TenantType = 'KINDERGARTEN' | 'PRIMARY_SCHOOL' | 'MIXED';
export type TenantStatus = 'PENDING_ONBOARDING' | 'ACTIVE' | 'SUSPENDED';

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
 * V1.6 — Brand JSON returned by the API on auth responses.
 * Can be null (use DEFAULT_BRAND) or a fully-merged TenantBrand.
 */
export type AuthTenantBrand = TenantBrand | Record<string, unknown> | null;

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  locale: Locale;
  timezone: string;
  brand: AuthTenantBrand;
  /** GTM — onboarding gate signals (API: status + onboardingCompletedAt !== null). */
  status?: TenantStatus;
  onboardingCompleted?: boolean;
}

/**
 * Full auth response from the NestJS API. Mobile keeps `refreshToken` in
 * the response shape (unlike web) because the mobile client must store it
 * itself in SecureStore — no cookie layer to do it for us.
 */
export interface AuthSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  tenant: AuthTenant | null;
}

export interface MeResponse {
  user: AuthUser;
  tenant: AuthTenant | null;
}
