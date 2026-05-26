'use client';

import type { Route } from 'next';
import { useRouter } from '@/i18n/routing';
import { useEffect } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { useAuthStore } from '@/lib/auth/use-auth-store';

import { BrandingForm } from './branding-form';

/**
 * V1.6 révisé 2026-05-23 PM — Client Component (le Server Component pattern
 * causait une boucle de redirect via refresh-token rotation ; cf
 * (app)/layout.tsx commentaire).
 *
 * Le parent AppShellClient gate déjà sur isHydrated+accessToken+user, donc
 * quand on monte ici, le store est garanti hydraté avec une session valide.
 * On vérifie juste le rôle et on délègue au BrandingForm.
 */
export default function BrandingSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard' as Route);
    }
  }, [user, router]);

  // Parent layout (AppShellClient) already shows a spinner until user is
  // hydrated. By the time we render here, user is non-null. Defensive guard:
  if (!user) return null;
  if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'SUPER_ADMIN') return null;

  const stored = (tenant?.brand ?? {}) as Partial<TenantBrand>;
  const initial: TenantBrand = { ...DEFAULT_BRAND, ...stored };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Apparence de votre école</h1>
        <p className="text-sm text-muted-foreground">
          Personnalisez les couleurs, le logo et le favicon visibles par les
          parents, enseignants et élèves.
        </p>
      </header>
      <BrandingForm initial={initial} />
    </div>
  );
}
