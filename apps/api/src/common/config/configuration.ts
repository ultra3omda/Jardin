import type { NodeEnv } from './env.validation';

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
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
