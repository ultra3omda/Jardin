import { create } from 'zustand';
import type { AuthUser, AuthTenant } from '@/lib/auth/types';

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
  clear: () => void;
  setHydrated: (v: boolean) => void;
}

/**
 * Auth store mobile — access token en mémoire uniquement.
 * Le refresh token est dans SecureStore (expo-secure-store).
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  tenant: null,
  isHydrated: false,
  setSession: ({ accessToken, user, tenant }) =>
    set({ accessToken, user, tenant, isHydrated: true }),
  clear: () =>
    set({ accessToken: null, user: null, tenant: null, isHydrated: true }),
  setHydrated: (v) => set({ isHydrated: v }),
}));
