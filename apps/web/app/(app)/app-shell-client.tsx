'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { type TenantBrand } from '@ecole-saas/shared';

import { Button } from '@/components/ui/button';
import { logout, refresh } from '@/lib/api/client';
import type { AuthSessionResponse } from '@/lib/auth/types';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export interface AppShellClientProps {
  children: ReactNode;
  /**
   * V1.6 — Server-rendered session passed in to pre-hydrate the Zustand
   * store (avoids the loading spinner flash that V1.5 had on every nav).
   */
  initialSession: AuthSessionResponse;
  /** Tenant brand already merged over DEFAULT_BRAND by the parent Server Component. */
  brand: TenantBrand;
  /** Tenant display name for the nav. */
  tenantName: string;
  /** True iff the user can edit branding (SCHOOL_ADMIN | SUPER_ADMIN). */
  canEditBranding: boolean;
}

export function AppShellClient({
  children,
  initialSession,
  brand,
  tenantName,
  canEditBranding,
}: AppShellClientProps) {
  const router = useRouter();
  const { accessToken, user, isHydrated, setSession, clear } = useAuthStore();
  const seededRef = useRef(false);

  // Seed the Zustand store from the server-rendered session on first mount.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (!accessToken) setSession(initialSession);
  }, [accessToken, setSession, initialSession]);

  // Fallback: if the store isn't hydrated by the time render begins
  // (e.g. after a hard reload with stale localStorage), refresh once.
  useEffect(() => {
    if (!isHydrated) return;
    if (accessToken && user) return;
    let cancelled = false;
    refresh()
      .then((session) => {
        if (!cancelled) setSession(session);
      })
      .catch(() => {
        if (cancelled) return;
        clear();
        router.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken, user, setSession, clear, router]);

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
    router.replace('/login');
  }

  return (
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
            {canEditBranding && (
              <Link
                href="/settings/branding"
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
  );
}
