import type { ConfigContext, ExpoConfig } from '@expo/config';

/**
 * Extends app.json. Injects the EAS projectId + runtime API URL from env so no
 * account-specific id is committed. Set EAS_PROJECT_ID (from `eas init`) and
 * EXPO_PUBLIC_API_URL in EAS build env / local .env.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Klasso',
  slug: config.slug ?? 'klasso',
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000',
    eas: {
      ...(config.extra?.eas ?? {}),
      ...(process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : {}),
    },
  },
  updates: {
    ...config.updates,
    ...(process.env.EAS_PROJECT_ID
      ? { url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}` }
      : {}),
  },
  runtimeVersion: { policy: 'appVersion' },
});
