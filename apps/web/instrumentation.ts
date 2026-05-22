import * as Sentry from '@sentry/nextjs';

/**
 * Next.js native instrumentation hook (App Router).
 * Called once per runtime (nodejs / edge) at server startup.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Forwards request errors that escape Route Handlers / Server Components
 * to Sentry. New in Next.js 15.3+ — safe no-op on older versions.
 */
export const onRequestError = Sentry.captureRequestError;
