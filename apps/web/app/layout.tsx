import type * as React from 'react';
/**
 * Root layout — minimal passthrough required by Next.js App Router when
 * the [locale] segment owns the actual <html>/<body>. See next-intl docs:
 * https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
