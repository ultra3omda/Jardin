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
  // PAS à nous. Notre vraie URL prod = ecole-saas-weld.vercel.app
  // (confirmé via Vercel get_project pour prj_DsqPNx90qY3R98l71Pr92DHPoE7R).
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
    webAppUrl: process.env.WEB_APP_URL ?? 'https://ecole-saas-weld.vercel.app',
    email: {
      resendApiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.EMAIL_FROM ?? 'onboarding@resend.dev',
    },
    r2: {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME ?? 'ecole-saas-exports',
      publicUrl: process.env.R2_PUBLIC_URL,
      tenantAssetsBucket: process.env.R2_TENANT_ASSETS_BUCKET ?? 'ecole-saas-tenant-assets',
    },
  };
}
