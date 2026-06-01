'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { Toaster } from '@/components/ui/toaster';
import { logout, refresh } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';
import { buildTenantUrl } from '@/lib/tenant/build-tenant-url';
import { shouldRedirectForSlugMismatch } from '@/lib/tenant/subdomain-consistency';

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  // V1.7-A — Subdomain<->JWT slug consistency (UX guard; isolation stays on the
  // JWT, D3). If the branded host disagrees with the session tenant, log out and
  // bounce to the correct host. No-op in path mode / on the apex / when disabled.
  useEffect(() => {
    if (!isHydrated || !tenant?.slug) return;
    const jwtSlug = tenant.slug;
    const mismatch = shouldRedirectForSlugMismatch({
      host: window.location.host,
      jwtSlug,
      enabled: process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN === 'true',
      baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn',
    });
    if (!mismatch) return;
    logout()
      .catch(() => undefined)
      .finally(() => {
        clear();
        window.location.assign(buildTenantUrl(jwtSlug, '/dashboard'));
      });
  }, [isHydrated, tenant?.slug, clear]);

  // GTM — Blocking onboarding gate. A SCHOOL_ADMIN whose organization hasn't
  // completed the personalization wizard is force-redirected to /onboarding and
  // cannot reach any (app) route until it's done. Other roles are unaffected.
  const needsOnboarding =
    user?.role === 'SCHOOL_ADMIN' && tenant != null && tenant.onboardingCompleted === false;
  useEffect(() => {
    if (!isHydrated || !accessToken || !needsOnboarding) return;
    router.replace('/onboarding' as never);
  }, [isHydrated, accessToken, needsOnboarding, router]);

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

  if (!isHydrated || !accessToken || !user || needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-50">
        <Loader2 className="h-8 w-8 animate-spin text-ambre-500" aria-label="Chargement" />
      </div>
    );
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    // Hard navigation (not the SPA router): once the auth state is cleared this
    // shell immediately renders the loader, and a client-side router.replace can
    // be swallowed before it commits — leaving the user stuck on the spinner.
    // A full document navigation guarantees we land on /login. The locale prefix
    // is preserved from the current path so we stay in the right language.
    const locale = window.location.pathname.split('/')[1] || 'fr';
    window.location.assign(`/${locale}/login`);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen bg-paper-50">
        <Sidebar
          onLogout={handleLogout}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 px-4 pb-6 sm:px-6">{children}</main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
