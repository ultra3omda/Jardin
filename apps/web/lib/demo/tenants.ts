'use client';

/**
 * Shared demo fixtures for the Admin / Tenants module.
 *
 * Single source of truth so the list view AND the tenant detail view fall
 * back to the SAME data when the API is unreachable. A demo click-through
 * (list → detail) therefore never shows an error banner.
 */
import type { TenantSummary } from '@/lib/api/admin-tenants';

export const DEMO_TENANTS: TenantSummary[] = [
  { id: 'demo-t-1', name: 'École El Khadra — Tunis', slug: 'el-khadra-tunis', type: 'PRIMARY_SCHOOL', locale: 'fr', brand: null, createdAt: '2024-01-15T08:00:00Z', usersCount: 87, adminOnboarded: true, inviteStatus: 'consumed' },
  { id: 'demo-t-2', name: 'Maternelle Les Étoiles — Sousse', slug: 'les-etoiles-sousse', type: 'KINDERGARTEN', locale: 'fr', brand: null, createdAt: '2024-03-01T08:00:00Z', usersCount: 34, adminOnboarded: true, inviteStatus: 'consumed' },
  { id: 'demo-t-3', name: 'École Carthage International', slug: 'carthage-intl', type: 'PRIMARY_SCHOOL', locale: 'fr', brand: null, createdAt: '2024-01-10T08:00:00Z', usersCount: 142, adminOnboarded: true, inviteStatus: 'consumed' },
  { id: 'demo-t-4', name: 'Groupe scolaire Ibn Sina', slug: 'ibn-sina', type: 'MIXED', locale: 'ar', brand: null, createdAt: '2024-01-08T08:00:00Z', usersCount: 215, adminOnboarded: true, inviteStatus: 'consumed' },
  { id: 'demo-t-5', name: 'École Privée Les Jasmins', slug: 'les-jasmins', type: 'PRIMARY_SCHOOL', locale: 'fr', brand: null, createdAt: '2025-03-20T08:00:00Z', usersCount: 76, adminOnboarded: false, inviteStatus: 'pending' },
];

/** Look up a demo tenant by id — used by the detail page as an API fallback. */
export function findDemoTenant(id: string): TenantSummary | undefined {
  return DEMO_TENANTS.find((t) => t.id === id);
}
