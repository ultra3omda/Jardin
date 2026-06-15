import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

// V0 — i18n. Bilingual FR/AR via /fr and /ar sub-paths (next-intl middleware).
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/**
 * Security headers applied to every response served by Next.js.
 * CSP is intentionally permissive on script/style to accommodate
 * shadcn/ui inline styles and next-intl; tighten per-route as needed.
 *
 * `upgrade-insecure-requests` and HSTS are emitted ONLY on Vercel (real HTTPS
 * origin). Off-Vercel they would break local dev and the http://localhost
 * Playwright E2E run (subresource/API requests would be force-upgraded to https
 * and fail), so they are gated on `process.env.VERCEL`.
 */
const isHttpsDeployment = process.env.VERCEL === '1';

const cspDirectives = [
  "default-src 'self'",
  // Next.js requires 'unsafe-eval' in dev; 'unsafe-inline' covers
  // shadcn/ui CSS-in-JS and Tailwind inline styles.
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  // API (custom domain api.klasso.tn, covered by *.klasso.tn) + Vercel preview URLs + Sentry tunnel.
  "connect-src 'self' https://*.klasso.tn wss://*.klasso.tn https://*.vercel.app https://o4505000000000000.ingest.sentry.io",
  "frame-src 'none'",
  "object-src 'none'",
  // Hardening: lock the document base, restrict form posts to same-origin
  // (all mutations go through fetch, never an HTML form action), and block
  // framing of our pages (clickjacking — complements X-Frame-Options).
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttpsDeployment ? ['upgrade-insecure-requests'] : []),
];

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // HSTS — 2 years, include subdomains (all *.klasso.tn are HTTPS on Vercel).
  // No `preload` (irreversible registry commitment — opt in deliberately later).
  ...(isHttpsDeployment
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ecole-saas/shared'],
  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // V0.7 — Allow Unsplash CDN for landing hero + trust accent photos.
  // Vercel Image Optimizer handles resize/format on its end; we ship no local
  // photo binary. CC0 license honored per ADR 0008 (Unsplash License).
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
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
