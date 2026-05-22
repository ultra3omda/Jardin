/**
 * Sentry client-side init — runs in the browser bundle.
 * Auto-loaded by the Sentry Next.js build plugin via withSentryConfig.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN_WEB;
const nodeEnv = process.env.NODE_ENV ?? 'development';

if (dsn && dsn.startsWith('https://')) {
  Sentry.init({
    dsn,
    environment: nodeEnv,
    // 10% sampling in prod — fits the Sentry free tier. 0% elsewhere.
    tracesSampleRate: nodeEnv === 'production' ? 0.1 : 0,
    // Default off for RGPD — no PII forwarded to Sentry.
    sendDefaultPii: false,
    // Session Replay disabled by default (separate quota line, off-tier risk).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
