'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { logout, refresh } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * V7 — AppShell with navy sidebar + paper main area. Sidebar nav derived from
 * `getNavForUser(user, tenant)` so the menu adapts per role × tenant.type.
 * Backwards compatible with V1.6 brand white-label runtime (CSS var injection).
 */
export function AppShellClient({ children }: { children: ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clear = useAuthStore((s) => s.clear);
  const refreshedRef = useRef(false);

  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    if (accessToken || refreshedRef.current) return;
    refreshedRef.current = true;
    refresh()
      .then((session) => setSession(session))
      .catch(() => {
        clear();
        router.replace('/login' as never);
      });
  }, [isHydrated, accessToken, setSession, clear, router]);

  const brand: TenantBrand = useMemo(() => {
    const stored = (tenant?.brand ?? {}) as Partial<TenantBrand>;
    return { ...DEFAULT_BRAND, ...stored };
  }, [tenant?.brand]);

  useEffect(() => {
    if (!user) return;
    let styleEl = document.getElementById('tenant-brand-vars-client');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tenant-brand-vars-client';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildBrandStyleTag(brand);

    if (brand.faviconUrl) {
      let iconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!iconEl) {
        iconEl = document.createElement('link');
        iconEl.rel = 'icon';
        document.head.appendChild(iconEl);
      }
      iconEl.href = brand.faviconUrl;
    }
  }, [brand, user]);

  if (!isHydrated || !accessToken || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-8 w-8 animate-spin text-ambre-500" aria-label="Chargement" />
      </div>
    );
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    router.replace('/login' as never);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-paper-50">
        <Sidebar onLogout={handleLogout} />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 pb-6">{children}</main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
