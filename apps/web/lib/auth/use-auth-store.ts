'use client';

import { create } from 'zustand';
import type { AuthSessionResponse, AuthTenant, AuthUser } from './types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  tenant: AuthTenant | null;
  isHydrated: boolean;
  setSession: (session: AuthSessionResponse) => void;
  setHydrated: (hydrated: boolean) => void;
  clear: () => void;
}

/**
 * Auth session store (Zustand) — access token stays in memory only.
 * The refresh token lives in an httpOnly cookie set by the Next.js Route
 * Handler proxy, so JavaScript never sees it (XSS-safe).
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  tenant: null,
  isHydrated: false,
  setSession: ({ accessToken, user, tenant }) =>
    set({ accessToken, user, tenant, isHydrated: true }),
  setHydrated: (hydrated) => set({ isHydrated: hydrated }),
  clear: () => set({ accessToken: null, user: null, tenant: null, isHydrated: true }),
}));
