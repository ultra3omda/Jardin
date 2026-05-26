import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

// V0 — i18n. Bilingual FR/AR via /fr and /ar sub-paths (next-intl middleware).
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecole-saas/shared'],
  experimental: {
    // V1.6 — typedRoutes désactivé. Les re-exports thin `/t/[slug]/X` →
    // import de `/X/page` cassent l'inférence du union Route (next-typed-routes
    // n'attend pas qu'un page.tsx en importe un autre). Trade-off accepté :
    // on perd la check compile-time des liens internes (catches typos comme
    // `/dashbaord`). Pourra être réactivé V11 quand on extraira les pages
    // V1.5 en composants client réutilisables (cross-page imports supprimés).
    // typedRoutes: true,
  },
};

// Compose: next config → next-intl → Sentry (outermost so its build
// plugin wraps the i18n-augmented config). Order matters.
export default withSentryConfig(withNextIntl(nextConfig), {
  // Silence Sentry's build-plugin logs in local dev; keep them in CI.
  silent: !process.env.CI,
  // Strip Sentry's verbose console.log from the client bundle in prod.
  disableLogger: true,
  // Helps Sentry locate static chunks when uploading sourcemaps.
  widenClientFileUpload: true,
  // Tunnel ad-blocker-friendly path; harmless if not needed.
  tunnelRoute: '/monitoring',
});
