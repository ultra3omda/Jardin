import { Platform } from 'react-native';
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
  /** URL publique du logo (R2). null pour retirer. */
  logoUrl?: string | null;
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

interface BrandingUploadResponse {
  uploadUrl: string;
  finalUrl: string;
}

/**
 * Web uniquement (comme l'upload des pièces jointes devoirs) : ouvre un
 * sélecteur de fichier, demande une URL signée R2, envoie le logo, et renvoie
 * l'URL publique finale (à echo via updateBranding({ logoUrl })). Sur natif →
 * null (différé, comme le reste de l'upload de fichiers).
 */
export async function pickAndUploadLogo(): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = (globalThis as any).document;
  if (!doc) return null;

  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/svg+xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const signed = await fetchApi<BrandingUploadResponse>(
          '/api/admin/tenant/branding/upload-url',
          { method: 'POST', body: JSON.stringify({ kind: 'logo', contentType: file.type }) },
        );
        const put = await fetch(signed.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!put.ok) throw new Error(`Upload échoué (${put.status})`);
        resolve(signed.finalUrl);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Upload échoué'));
      }
    };
    input.click();
  });
}

