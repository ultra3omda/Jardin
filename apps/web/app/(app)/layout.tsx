import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DEFAULT_BRAND } from '@ecole-saas/shared';

import { getMeFromCookies } from '@/lib/api/server-client';
import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';
import type { AuthSessionResponse } from '@/lib/auth/types';

import { AppShellClient } from './app-shell-client';

/**
 * V1.6 — (app) layout is now a Server Component that:
 *   1. Loads the session server-side via getMeFromCookies().
 *      Redirects to /login if no valid session.
 *   2. Resolves the tenant brand (merged over DEFAULT_BRAND).
 *   3. Injects CSS variables in <style> so shadcn primitives render
 *      with the tenant theme on the FIRST paint (no flash of default theme).
 *   4. Delegates the interactive nav + child rendering to AppShellClient
 *      (Client Component) with the session pre-hydrated.
 *
 * The middleware already redirects cookie-less requests to /login, but we
 * double-check here for cases where the cookie exists but the refresh token
 * is revoked / expired.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getMeFromCookies();
  if (!session) redirect('/login');

  const brand = session.tenant?.brand ?? DEFAULT_BRAND;
  const tenantName = session.tenant?.name ?? 'École SaaS';
  const canEditBranding =
    session.user.role === 'SCHOOL_ADMIN' || session.user.role === 'SUPER_ADMIN';
  const cssOverride = buildBrandStyleTag(brand);

  // Build the session shape consumed by the client (refresh token stripped).
  // session.tenant.brand is a structurally compatible TenantBrand object;
  // cast through unknown because AuthTenant declares brand as the loose
  // Record<string, unknown> shape (covers both raw partial and fully merged).
  const initialSession: AuthSessionResponse = {
    accessToken: session.accessToken,
    user: session.user,
    tenant: session.tenant as unknown as AuthSessionResponse['tenant'],
  };

  return (
    <>
      <style
        id="tenant-brand-vars"
        dangerouslySetInnerHTML={{ __html: cssOverride }}
      />
      {brand.faviconUrl && <link rel="icon" href={brand.faviconUrl} />}
      <AppShellClient
        initialSession={initialSession}
        brand={brand}
        tenantName={tenantName}
        canEditBranding={canEditBranding}
      >
        {children}
      </AppShellClient>
    </>
  );
}
