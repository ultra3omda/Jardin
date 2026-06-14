import { create } from 'zustand';
import type { TenantBrand } from '@ecole-saas/shared';
import type { AuthUser, AuthTenant } from '@/lib/auth/types';
import { useTenantStore } from '@/lib/tenant/store';
import { queryClient } from '@/lib/query-client';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isHydrated: boolean;
  setSession: (session: {
    accessToken: string;
    user: AuthUser;
    tenant: AuthTenant | null;
  }) => void;
  /** Partially update the current tenant (e.g. after onboarding completion). */
  patchTenant: (patch: Partial<AuthTenant>) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

/**
 * Auth store mobile — access token en mémoire uniquement.
 * Le refresh token est dans SecureStore (expo-secure-store).
 *
 * setSession est LE point de passage de tous les flux (login, demo-login,
 * refresh au boot), donc il porte deux effets transverses :
 *  1. Si l'identité change (autre userId), on vide le cache React Query —
 *     les query keys sont tenant-agnostiques, sans ça l'utilisateur suivant
 *     verrait les données en cache du tenant précédent (ex: démo École
 *     affichant les classes du Jardin d'enfants).
 *  2. On synchronise le TenantStore (slug/nom/brand) depuis la réponse auth,
 *     pour que le thème white-label s'applique dès la connexion et survive
 *     au cold start (le boot refresh repasse par ici).
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  tenant: null,
  isHydrated: false,
  setSession: ({ accessToken, user, tenant }) => {
    if (get().user?.id !== user.id) {
      queryClient.clear();
    }
    if (tenant) {
      useTenantStore
        .getState()
        .setTenant(tenant.slug, tenant.name, (tenant.brand ?? {}) as Partial<TenantBrand>);
    }
    set({ accessToken, user, tenant, isHydrated: true });
  },
  patchTenant: (patch) =>
    set((s) => {
      if (!s.tenant) return s;
      const tenant = { ...s.tenant, ...patch };
      if (patch.name !== undefined || patch.brand !== undefined) {
        useTenantStore
          .getState()
          .setTenant(tenant.slug, tenant.name, (tenant.brand ?? {}) as Partial<TenantBrand>);
      }
      return { tenant };
    }),
  clear: () => {
    queryClient.clear();
    set({ accessToken: null, user: null, tenant: null, isHydrated: true });
  },
  setHydrated: (v) => set({ isHydrated: v }),
}));
