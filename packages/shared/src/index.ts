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
  | 'super_admin' // plateforme SaaS (CEO Klasso)
  | 'commercial' // sous-admin plateforme : signe les contrats & crée les organisations
  | 'school_admin' // directeur d'établissement
  | 'teacher'
  | 'parent'
  | 'staff'; // personnel non-enseignant

/**
 * Rôles « plateforme » (Klasso) — non rattachés à une organisation (tenantId null).
 * Ils n'ont jamais accès aux données d'un établissement.
 */
export const PLATFORM_ROLES = ['super_admin', 'commercial'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/**
 * Cycle de vie d'une organisation, du contrat signé à l'usage.
 * - `pending_onboarding` : créée par le commercial, l'admin n'a pas encore
 *   personnalisé l'app (nom + couleurs + logo) → onboarding bloquant.
 * - `active` : onboarding terminé, application utilisable.
 * - `suspended` : accès coupé (impayé, fin de contrat…).
 */
export type TenantStatus = 'pending_onboarding' | 'active' | 'suspended';

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
// Tenant white-label (V1.6 — D20)
// ============================================================================

export * from './tenant-brand';

// ============================================================================
// Sélection d'élèves (multi-select : toute la classe cochée par défaut)
// ============================================================================

export * from './student-selection';

// ============================================================================
// RH / Paie (T2c)
// ============================================================================

/**
 * Allocation annuelle de congés payés (jours), MVP T2c V2.
 * Constante configurable — sert au calcul du solde dérivé (jours pris vs alloués).
 */
export const ANNUAL_LEAVE_ALLOWANCE_DAYS = 24;

// ============================================================================
// GTM — Contrats signés
// ============================================================================

/** Contrat signé rattaché à une organisation par le commercial. */
export interface Contract {
  id: string;
  tenantId: TenantId;
  reference: string | null;
  fileName: string;
  signedAt: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

// ============================================================================
// Version
// ============================================================================

export const SHARED_VERSION = '0.1.0';
