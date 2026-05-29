import type { NodeEnv } from './env.validation';

/**
 * Origins toujours autorisés en plus de la var d'env `CORS_ORIGIN`.
 * Évite un CORS-block silencieux quand un nouveau front cloud est livré
 * et que l'env Railway n'a pas (encore) été mis à jour.
 *
 * À étendre quand on ajoute un domaine custom (klasso.tn, *.klasso.tn,
 * subdomains tenants V1.7-B). Préférer cette liste pour les domaines
 * STABLES owned par Klasso plutôt que de demander un edit env à chaque
 * déploiement.
 */
const KLASSO_KNOWN_ORIGINS = [
  // Note : ecole-saas.vercel.app appartient au projet Klasio (Côte d'Ivoire),
  // PAS à nous. Notre déploiement Vercel = ecole-saas-weld.vercel.app
  // (prj_DsqPNx90qY3R98l71Pr92DHPoE7R), exposé publiquement via le domaine
  // custom klasso.tn — l'URL prod CANONIQUE des liens sortants (voir
  // `webAppUrl` ci-dessous). Les deux origines restent whitelistées pour CORS.
  'https://ecole-saas-weld.vercel.app',
  'https://klasso-mobile.vercel.app',
  'https://klasso.tn',
];

function buildCorsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return Array.from(new Set([...KLASSO_KNOWN_ORIGINS, ...fromEnv]));
}

export interface AppConfig {
  nodeEnv: NodeEnv;
  apiPort: number;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  bcryptRounds: number;
  corsOrigin: string[];
  webAppUrl: string;
  email: {
    resendApiKey: string;
    from: string;
  };
  /** V10 — Expo push notifications (mobile) */
  push: {
    /** Optional Expo access token for enhanced push security; empty = anonymous */
    expoAccessToken: string | undefined;
  };
  r2: {
    accountId: string | undefined;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    bucketName: string;
    /** V1.6 — public base URL for tenant assets, used for anti-SSRF check */
    publicUrl: string | undefined;
    /** V1.6 — bucket for white-label tenant logos/favicons */
    tenantAssetsBucket: string;
  };
  /** Landing page — Cloudflare Turnstile server-side verification */
  turnstile: {
    secretKey: string | undefined;
  };
  /** Landing page — demo request notification recipient */
  demoRequest: {
    toEmail: string | undefined;
  };
}

export function configuration(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV as NodeEnv,
    apiPort: parseInt(process.env.API_PORT ?? '4000', 10),
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    },
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    corsOrigin: buildCorsOrigins(),
    webAppUrl: process.env.WEB_APP_URL ?? 'https://klasso.tn',
    email: {
      resendApiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
    },
    push: {
      expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
    },
    r2: {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME ?? 'ecole-saas-exports',
      publicUrl: process.env.R2_PUBLIC_URL,
      tenantAssetsBucket: process.env.R2_TENANT_ASSETS_BUCKET ?? 'ecole-saas-tenant-assets',
    },
    turnstile: {
      secretKey: process.env.TURNSTILE_SECRET_KEY,
    },
    demoRequest: {
      toEmail: process.env.DEMO_REQUEST_TO_EMAIL,
    },
  };
}
