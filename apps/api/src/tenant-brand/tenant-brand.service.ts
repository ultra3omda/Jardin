import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { DEFAULT_BRAND, TenantBrand } from '@ecole-saas/shared';

import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import {
  CreateBrandingUploadUrlDto,
  UpdateBrandingDto,
} from './dto/update-branding.dto';

const UPLOAD_TTL_S = 300;
const ALLOWED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

@Injectable()
export class TenantBrandService {
  private readonly logger = new Logger(TenantBrandService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  /**
   * Load the brand for a tenant (by id). Returns a fully-populated TenantBrand
   * by merging stored partial JSON over DEFAULT_BRAND. Safe to call for any
   * tenant — never throws if brand is null/empty.
   */
  async findByTenant(tenantId: string): Promise<TenantBrand> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { brand: true },
    });
    const stored = (t?.brand ?? {}) as Partial<TenantBrand>;
    return { ...DEFAULT_BRAND, ...stored };
  }

  /**
   * Public-facing lookup by slug (used by the unauthenticated
   * GET /api/public/tenant-brand/:slug endpoint). Returns null on 404
   * or soft-deleted tenant.
   */
  async findBySlug(
    slug: string,
  ): Promise<{ name: string; brand: TenantBrand } | null> {
    const t = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true, name: true, brand: true, deletedAt: true },
    });
    if (!t || t.deletedAt) return null;
    const stored = (t.brand ?? {}) as Partial<TenantBrand>;
    return { name: t.name, brand: { ...DEFAULT_BRAND, ...stored } };
  }

  /**
   * Update branding for a tenant. Enforces anti-SSRF: any logoUrl/faviconUrl
   * value (other than null) MUST start with the configured R2_PUBLIC_URL.
   * This prevents an attacker from setting brand.logoUrl =
   * 'http://internal-metadata/admin' which would be fetched by our backend
   * during cache warmup or image proxying.
   */
  async update(
    tenantId: string,
    dto: UpdateBrandingDto,
  ): Promise<TenantBrand> {
    const publicUrl = this.config.get<string>('r2.publicUrl');
    if (publicUrl) {
      for (const field of ['logoUrl', 'faviconUrl'] as const) {
        const value = dto[field];
        if (value && !value.startsWith(publicUrl)) {
          throw new BadRequestException({
            code: 'BRAND_URL_NOT_IN_R2',
            message: `${field} doit pointer vers ${publicUrl}`,
          });
        }
      }
    }

    const current = await this.findByTenant(tenantId);
    const next: TenantBrand = { ...current, ...dto } as TenantBrand;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { brand: next as unknown as object },
    });

    this.logger.log(
      `tenant.brand.updated tenantId=${tenantId} fields=${Object.keys(dto).join(',')}`,
    );
    return next;
  }

  /** Reset brand to NULL → DEFAULT_BRAND on next read. */
  async reset(tenantId: string): Promise<TenantBrand> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      // Prisma's typed update doesn't accept `null` for a JSON column literally —
      // cast through unknown is the documented escape hatch.
      data: { brand: null as unknown as undefined },
    });
    this.logger.log(`tenant.brand.reset tenantId=${tenantId}`);
    return DEFAULT_BRAND;
  }

  /**
   * Generate a presigned PUT URL the browser uses to upload a logo/favicon
   * directly to R2. Returns the final public URL so the client can echo it
   * back via a subsequent PATCH /branding call (which then passes the
   * anti-SSRF check because the URL starts with R2_PUBLIC_URL).
   *
   * Throws BadRequestException on bad MIME type. Throws ServiceUnavailableException
   * (via R2Service) if R2 is not configured.
   */
  async createUploadUrl(
    tenantId: string,
    dto: CreateBrandingUploadUrlDto,
  ): Promise<{ uploadUrl: string; finalUrl: string }> {
    if (!ALLOWED_IMAGE_MIMES.includes(dto.contentType)) {
      throw new BadRequestException({
        code: 'BRAND_CONTENT_TYPE_FORBIDDEN',
        message: `contentType "${dto.contentType}" interdit (autorisés : ${ALLOWED_IMAGE_MIMES.join(', ')})`,
      });
    }

    const bucket = this.config.get<string>(
      'r2.tenantAssetsBucket',
      'ecole-saas-tenant-assets',
    );
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const ext =
      dto.contentType === 'image/png'
        ? 'png'
        : dto.contentType === 'image/jpeg'
          ? 'jpg'
          : dto.contentType === 'image/svg+xml'
            ? 'svg'
            : 'ico';
    const key = `tenants/${tenantId}/${dto.kind}-${createId()}.${ext}`;
    const uploadUrl = await this.r2.signedPutUrl(
      key,
      dto.contentType,
      UPLOAD_TTL_S,
      bucket,
    );
    const finalUrl = publicUrl
      ? `${publicUrl}/${key}`
      : `r2://${bucket}/${key}`;
    return { uploadUrl, finalUrl };
  }
}
