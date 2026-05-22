import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

// V1.5 — i18n. Single-locale FR for now; the [locale] segment + locale
// switcher come in V2.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecole-saas/shared'],
  experimental: {
    typedRoutes: true,
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
