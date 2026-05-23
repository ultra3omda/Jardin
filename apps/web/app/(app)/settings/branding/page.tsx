import { redirect } from 'next/navigation';
import { DEFAULT_BRAND } from '@ecole-saas/shared';

import { getMeFromCookies } from '@/lib/api/server-client';

import { BrandingForm } from './branding-form';

/**
 * V1.6 — /settings/branding page (SCHOOL_ADMIN | SUPER_ADMIN only).
 * Forwards the live brand from the parent (app) layout's session as the
 * initial form state (BrandingForm refetches on mount as a safety net).
 */
export default async function BrandingSettingsPage() {
  const session = await getMeFromCookies();
  if (!session) redirect('/login?next=/settings/branding');

  const role = session.user.role;
  if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const initial = session.tenant?.brand ?? DEFAULT_BRAND;

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
