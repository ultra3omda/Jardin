/**
 * Sentry init for the Next.js Edge runtime (V8 isolate — middleware on
 * the edge, edge Route Handlers, etc.).
 * Loaded by instrumentation.ts via dynamic import on the edge runtime.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN_WEB;
const nodeEnv = process.env.NODE_ENV ?? 'development';

if (dsn && dsn.startsWith('https://')) {
  Sentry.init({
    dsn,
    environment: nodeEnv,
    tracesSampleRate: nodeEnv === 'production' ? 0.1 : 0,
    sendDefaultPii: false,
  });
}
