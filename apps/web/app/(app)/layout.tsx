'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { logout, refresh } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/use-auth-store';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { accessToken, user, tenant, isHydrated, setSession, clear } = useAuthStore();
  const refreshAttempted = useRef(false);

  useEffect(() => {
    if (accessToken || refreshAttempted.current) return;
    refreshAttempted.current = true;
    refresh()
      .then((session) => setSession(session))
      .catch(() => {
        clear();
        router.replace('/login');
      });
  }, [accessToken, setSession, clear, router]);

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
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight">École SaaS</span>
            {tenant && (
              <>
                <span className="text-muted-foreground" aria-hidden="true">
                  /
                </span>
                <span className="text-sm text-muted-foreground">{tenant.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
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
