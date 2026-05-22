import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecole-saas/shared'],
  experimental: {
    typedRoutes: true,
  },
};

// V1.5 — Sentry. Wrapping is a no-op when NEXT_PUBLIC_SENTRY_DSN_WEB is
// missing (each sentry.*.config.ts file already gates on the DSN).
export default withSentryConfig(nextConfig, {
  // Silence Sentry's build-plugin logs in local dev; keep them in CI.
  silent: !process.env.CI,
  // Strip Sentry's verbose console.log from the client bundle in prod.
  disableLogger: true,
  // Helps Sentry locate static chunks when uploading sourcemaps.
  widenClientFileUpload: true,
  // Tunnel ad-blocker-friendly path; harmless if not needed.
  tunnelRoute: '/monitoring',
});
