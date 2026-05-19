/**
 * @ecole-saas/shared
 *
 * Types et utilitaires partagés entre web, mobile et API.
 * Single source of truth pour le modèle de données.
 */

// ============================================================================
// Multi-tenant
// ============================================================================

/** Identifiant d'un établissement (école / jardin d'enfant) */
export type TenantId = string;

export interface Tenant {
  id: TenantId;
  name: string;
  slug: string;
  type: 'kindergarten' | 'primary_school' | 'mixed';
  locale: Locale;
  timezone: string;
  createdAt: string;
}

// ============================================================================
// I18n
// ============================================================================

export const SUPPORTED_LOCALES = ['fr', 'en', 'ar', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

// ============================================================================
// Users & Roles
// ============================================================================

export type UserRole =
  | 'super_admin' // plateforme SaaS
  | 'school_admin' // directeur d'établissement
  | 'teacher'
  | 'parent'
  | 'staff'; // personnel non-enseignant

export interface User {
  id: string;
  tenantId: TenantId | null; // null pour super_admin
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locale: Locale;
  createdAt: string;
}

// ============================================================================
// API responses
// ============================================================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// Version
// ============================================================================

export const SHARED_VERSION = '0.1.0';
