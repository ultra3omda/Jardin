import { fetchApi } from './client';
import type { TenantBrand } from '@ecole-saas/shared';

export interface PublicTenantBrandResponse {
  slug: string;
  name: string;
  brand: TenantBrand;
}

/**
 * GET /api/public/tenant-brand/:slug
 *
 * NOTE: The API only returns `{ name, brand }` (see TenantBrandService.findBySlug).
 * We re-attach `slug` client-side so downstream consumers (TenantStore, hook)
 * always have the trio without re-plumbing the request param.
 */
export async function getTenantBrand(slug: string): Promise<PublicTenantBrandResponse> {
  const raw = await fetchApi<{ name: string; brand: TenantBrand }>(
    `/api/public/tenant-brand/${encodeURIComponent(slug)}`,
    {},
    false,
  );
  return { slug, name: raw.name, brand: raw.brand };
}
