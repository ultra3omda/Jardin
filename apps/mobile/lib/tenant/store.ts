import { create } from 'zustand';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

interface TenantState {
  slug: string | null;
  name: string | null;
  brand: TenantBrand;
  setTenant: (slug: string, name: string, brand: Partial<TenantBrand>) => void;
  clear: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  slug: null,
  name: null,
  brand: DEFAULT_BRAND,
  setTenant: (slug, name, brand) =>
    set({ slug, name, brand: { ...DEFAULT_BRAND, ...brand } }),
  clear: () => set({ slug: null, name: null, brand: DEFAULT_BRAND }),
}));
