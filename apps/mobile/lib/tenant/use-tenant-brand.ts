import { useQuery } from '@tanstack/react-query';
import { getTenantBrand } from '@/lib/api/tenant';
import { useTenantStore } from './store';
import type { TenantBrand } from '@ecole-saas/shared';
import { DEFAULT_BRAND } from '@ecole-saas/shared';

/**
 * Charge et met en cache le brand du tenant via TanStack Query (5 min TTL).
 * Met à jour le TenantStore au succès.
 */
export function useTenantBrand(slug: string | null): {
  brand: TenantBrand;
  tenantName: string | null;
  isLoading: boolean;
  error: Error | null;
} {
  const setTenant = useTenantStore((s) => s.setTenant);
  const cachedBrand = useTenantStore((s) => s.brand);
  const cachedName = useTenantStore((s) => s.name);

  const { isLoading, error } = useQuery({
    queryKey: ['tenant-brand', slug],
    queryFn: async () => {
      if (!slug) return null;
      const data = await getTenantBrand(slug);
      setTenant(data.slug, data.name, data.brand);
      return data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    brand: cachedBrand ?? DEFAULT_BRAND,
    tenantName: cachedName,
    isLoading,
    error: error as Error | null,
  };
}
