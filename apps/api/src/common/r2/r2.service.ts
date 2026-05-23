import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const SIGNED_URL_DEFAULT_TTL_S = 24 * 60 * 60;

/**
 * Thin wrapper around the S3-compatible Cloudflare R2 API.
 *
 * Boots in "disabled" mode if any of the 3 secret env vars is missing
 * (local dev / CI without R2 still starts up). Any call into a disabled
 * service throws `ServiceUnavailableException` so callers fail clean
 * rather than silently swallow exports / uploads.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client | null;
  private readonly bucketName: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string | undefined>('r2.accountId');
    const accessKeyId = this.config.get<string | undefined>('r2.accessKeyId');
    const secretAccessKey = this.config.get<string | undefined>('r2.secretAccessKey');
    this.bucketName = this.config.get<string>('r2.bucketName', 'ecole-saas-exports');

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'R2Service: missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY — running in DISABLED mode. RGPD exports will fail with 503.',
      );
      this.client = null;
      this.enabled = false;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.enabled = true;
    this.logger.log(`R2Service: configured for bucket "${this.bucketName}"`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Upload a Buffer to the bucket at `key`. Throws ServiceUnavailableException
   * if R2 is not configured.
   */
  async putBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
    if (!this.enabled || !this.client) {
      throw new ServiceUnavailableException({
        code: 'R2_NOT_CONFIGURED',
        message: 'Object storage is not configured.',
      });
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Generate a pre-signed GET URL for the given object key.
   * Default TTL: 24 hours. Throws ServiceUnavailableException if R2 is not
   * configured.
   */
  async signedGetUrl(
    key: string,
    expiresInSeconds: number = SIGNED_URL_DEFAULT_TTL_S,
  ): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new ServiceUnavailableException({
        code: 'R2_NOT_CONFIGURED',
        message: 'Object storage is not configured.',
      });
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  /**
   * V1.6 — Generate a pre-signed PUT URL so the client (browser) can upload
   * directly to R2 without proxying through our API. Optionally targets
   * a different bucket than the default (e.g. tenant-assets vs exports).
   *
   * Used by TenantBrandService.createUploadUrl for school logos/favicons.
   * Default TTL: 5 minutes (uploads should happen quickly after URL handoff).
   */
  async signedPutUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 300,
    bucket?: string,
  ): Promise<string> {
    if (!this.enabled || !this.client) {
      throw new ServiceUnavailableException({
        code: 'R2_NOT_CONFIGURED',
        message: 'Object storage is not configured.',
      });
    }
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: bucket ?? this.bucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: expiresInSeconds },
    );
  }
}
