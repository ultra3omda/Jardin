import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { getTenantBrand } from '@/lib/tenant/brand';
import { buildBrandStyleTag } from '@/lib/tenant/brand-style-tag';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

/**
 * V1.6 — Pre-auth path-based tenant layout. Wraps the 5 auth pages
 * (login/register/forgot/reset/verify) under /t/[slug]/* and injects
 * the tenant's brand CSS variables BEFORE the page renders so first paint
 * is already branded.
 *
 * If the slug doesn't match any tenant → 404 page (notFound()) with the
 * default theme.
 */
export default async function TenantAuthLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const result = await getTenantBrand(slug);
  if (!result) notFound();

  const cssOverride = buildBrandStyleTag(result.brand);
  return (
    <>
      <style
        id="tenant-brand-vars"
        dangerouslySetInnerHTML={{ __html: cssOverride }}
      />
      {result.brand.faviconUrl && <link rel="icon" href={result.brand.faviconUrl} />}
      {children}
    </>
  );
}

/**
 * Generates page metadata (title, favicon) per tenant — visible in the
 * browser tab BEFORE login.
 */
export async function generateMetadata({
  params,
}: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTenantBrand(slug);
  if (!result) {
    return { title: 'École introuvable — École SaaS' };
  }
  return {
    title: `${result.name} — École SaaS`,
    icons: result.brand.faviconUrl
      ? [{ rel: 'icon', url: result.brand.faviconUrl }]
      : undefined,
  };
}
