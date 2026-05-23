import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';

export interface PublicBrandResponse {
  name: string;
  brand: TenantBrand;
}

/**
 * V1.6 — Server-side fetch of a tenant's public branding by slug.
 *
 * - Returns null on 404 (caller decides whether to 404 the page or fall back).
 * - On any other error (network, 5xx), returns { name: 'École SaaS', brand: DEFAULT_BRAND }
 *   so the page renders with the indigo default rather than blowing up.
 * - Tagged with `tenant-brand:<slug>` for Next.js cache revalidation
 *   (the API PATCH endpoint can later trigger revalidateTag here).
 * - Cache TTL: 5 min (matches the API Cache-Control header).
 */
export async function getTenantBrand(
  slug: string,
): Promise<PublicBrandResponse | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/public/tenant-brand/${encodeURIComponent(slug)}`,
      {
        next: { revalidate: 300, tags: [`tenant-brand:${slug}`] },
      },
    );
    if (res.status === 404) return null;
    if (!res.ok) return { name: 'École SaaS', brand: DEFAULT_BRAND };
    return (await res.json()) as PublicBrandResponse;
  } catch {
    return { name: 'École SaaS', brand: DEFAULT_BRAND };
  }
}

export { DEFAULT_BRAND };
export type { TenantBrand };
