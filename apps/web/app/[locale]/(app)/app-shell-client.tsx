'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useRouter } from '@/i18n/routing';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { Button } from '@/components/ui/button';
import { logout, refresh } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';
import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';

// V1.8 — TanStack Query client for the admin section (and any future client
// data fetching). Module-scope = single instance shared across the app shell.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * V1.6 révisé 2026-05-23 PM — AppShellClient repris du pattern V1.5 (Client
 * Component pur). Le brand vient de `user.tenant.brand` (renvoyé par
 * /api/auth/me + /api/auth/refresh depuis V1.6 API change).
 *
 * Pourquoi pas de Server Component prefetch ici :
 * V1.5 refresh-token rotation = un /auth/refresh server-side revoke le cookie
 * browser → 2ème nav = 401 → boucle infinie /dashboard ↔ /login. Voir layout.tsx
 * pour le détail. Trade-off : ~100ms flash de thème indigo défaut au 1er
 * paint, puis injection client-side dans <style id="tenant-brand-vars-client">.
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

  // V1.6 BUG FIX 2026-05-23 22h — Mark store as hydrated on first client mount.
  // The Zustand store starts isHydrated=false but has no `persist` middleware,
  // so nothing ever set it to true → the refresh useEffect below was guarded
  // on `isHydrated` and never fired → spinner perpétuel sur /dashboard après
  // un hard reload. Pattern standard pour gérer SSR/CSR mismatch sans persist.
  useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  // V1.5 pattern — single refresh on mount if store empty (no rotation race
  // because this is a Client Component → browser handles the Set-Cookie).
  useEffect(() => {
    if (!isHydrated) return;
    if (accessToken || refreshedRef.current) return;
    refreshedRef.current = true;
    refresh()
      .then((session) => setSession(session))
      .catch(() => {
        clear();
        router.replace('/login' as Route);
      });
  }, [isHydrated, accessToken, setSession, clear, router]);

  // V1.6 — derive brand from store (tenant.brand may be partial JSON from API
  // or DEFAULT_BRAND if tenant has no customisation). Merge over DEFAULT_BRAND
  // so consumers can always read all fields.
  const brand: TenantBrand = useMemo(() => {
    const stored = (tenant?.brand ?? {}) as Partial<TenantBrand>;
    return { ...DEFAULT_BRAND, ...stored };
  }, [tenant?.brand]);

  const tenantName = tenant?.name ?? 'École SaaS';
  const canEditBranding = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const canAdmin = user?.role === 'SUPER_ADMIN';

  // V1.6 — inject CSS vars + favicon client-side after the brand is resolved.
  // Mutates <head> so child pages get the theme without re-render.
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Chargement" />
      </div>
    );
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    clear();
    router.replace('/login' as Route);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3">
              {brand.logoUrl ? (
                <Image
                  src={brand.logoUrl}
                  alt={tenantName}
                  width={28}
                  height={28}
                  className="rounded"
                  unoptimized
                />
              ) : (
                <span
                  className="font-semibold tracking-tight"
                  style={{ color: brand.primaryColor }}
                >
                  {tenantName}
                </span>
              )}
              {brand.logoUrl && (
                <span className="text-sm font-medium text-muted-foreground">
                  {tenantName}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-3">
              {canAdmin && (
                <Link
                  href={'/admin/tenants' as Route}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Administration
                </Link>
              )}
              {user.role !== 'SUPER_ADMIN' && (
                <Link
                  href={'/students' as Route}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Élèves
                </Link>
              )}
              {canEditBranding && (
                <Link
                  href={'/settings/branding' as Route}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  Apparence
                </Link>
              )}
              <Link
                href="/profile"
                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                {user.firstName} {user.lastName}
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Déconnexion
              </Button>
            </div>
          </div>
        </header>
        <main className="container flex-1 py-8">{children}</main>
      </div>
    </QueryClientProvider>
  );
}
