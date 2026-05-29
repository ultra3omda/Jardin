import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT: number = 4000;

  @IsString()
  @MinLength(20)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_ACCESS_SECRET must be at least 32 characters (>= 256 bits)',
  })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET must be at least 32 characters (>= 256 bits)',
  })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_ROUNDS: number = 12;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  @Matches(/^https?:\/\/.+/, { message: 'WEB_APP_URL must be an absolute http(s) URL' })
  WEB_APP_URL: string = 'https://klasso.tn';

  @IsString()
  @MinLength(10, { message: 'RESEND_API_KEY must be set (looks like `re_…`)' })
  RESEND_API_KEY!: string;

  @IsString()
  EMAIL_FROM: string = 'onboarding@resend.dev';

  // V1.5 — Cloudflare R2 (RGPD exports). All optional: if any is missing,
  // ExportService will refuse with a clear error but the API still boots.
  @IsOptional() @IsString() R2_ACCOUNT_ID?: string;
  @IsOptional() @IsString() R2_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() R2_SECRET_ACCESS_KEY?: string;
  @IsOptional() @IsString() R2_BUCKET_NAME?: string;

  // V1.6 — Cloudflare R2 white-label tenant assets bucket (logos/favicons).
  // R2_PUBLIC_URL is the public base URL (e.g. https://pub-<hash>.r2.dev or
  // https://assets.ecole-saas.com once V11 lands). TenantBrandService uses it
  // for anti-SSRF validation: logoUrl/faviconUrl must start with it.
  @IsOptional() @IsString() @MinLength(10) R2_PUBLIC_URL?: string;
  @IsOptional() @IsString() R2_TENANT_ASSETS_BUCKET?: string;

  // V1.5 — Sentry DSN for server-side error reporting. Optional — if
  // missing, Sentry init is skipped (see src/instrument.ts).
  @IsOptional() @IsString() SENTRY_DSN_API?: string;

  // Landing page — Cloudflare Turnstile server-side secret.
  // Optional: if missing, the service skips verification (DEV ONLY mode).
  @IsOptional() @IsString() TURNSTILE_SECRET_KEY?: string;

  // Landing page — email address that receives demo request notifications.
  // Optional: if missing, email sending is skipped and only audit log is written.
  @IsOptional() @IsString() DEMO_REQUEST_TO_EMAIL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${messages}`);
  }
  return validated;
}
