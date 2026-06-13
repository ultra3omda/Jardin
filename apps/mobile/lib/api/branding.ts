import { fetchApi } from './client';
import type { TenantBrand } from '@ecole-saas/shared';

/**
 * White-label : couleurs de l'établissement (SCHOOL_ADMIN).
 * Miroir de apps/api/src/tenant-brand/tenant-brand.controller.ts
 * (routes /api/admin/tenant/branding). Le logo (upload) viendra avec
 * expo-image-picker (lot deps).
 */
export interface BrandColors {
  primaryColor?: string;
  primaryHover?: string;
  secondaryColor?: string;
  emailHeaderColor?: string;
}

export const BRANDING_KEY = ['branding'] as const;

export function getBranding(): Promise<TenantBrand> {
  return fetchApi<TenantBrand>('/api/admin/tenant/branding');
}

export function updateBranding(input: BrandColors): Promise<TenantBrand> {
  return fetchApi<TenantBrand>('/api/admin/tenant/branding', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
