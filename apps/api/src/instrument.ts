/**
 * Sentry bootstrap — MUST be imported as the very first line in main.ts,
 * before AppModule. Sentry patches Node's HTTP / Express libraries at
 * import time; loading any other code first means missing instrumentation.
 *
 * Reads SENTRY_DSN_API + NODE_ENV from process.env directly (ConfigService
 * isn't available yet at this point in the boot).
 *
 * If SENTRY_DSN_API is missing, this is a no-op. We deliberately don't
 * throw so that local dev / CI without Sentry still boots cleanly.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN_API;
const nodeEnv = process.env.NODE_ENV ?? 'development';

if (dsn && dsn.startsWith('https://')) {
  Sentry.init({
    dsn,
    environment: nodeEnv,
    // 10% sampling in prod — fits the Sentry free tier (10k perf events
    // / mo) while still giving meaningful visibility. 0% elsewhere.
    tracesSampleRate: nodeEnv === 'production' ? 0.1 : 0,
    // Default off for RGPD — opt-in PII only.
    sendDefaultPii: false,
    // Link issues to the release / commit when Railway or Vercel inject it.
    release:
      process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
  });
} else {
  // eslint-disable-next-line no-console
  console.log('[sentry] SENTRY_DSN_API missing — error reporting disabled.');
}
