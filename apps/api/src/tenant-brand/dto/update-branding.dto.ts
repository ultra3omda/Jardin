import { IsIn, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';
import { IsHexColor } from '../validators/hex-color.validator';

/**
 * PATCH /api/admin/tenant/branding — all fields optional (partial update).
 * Pass `null` to logoUrl/faviconUrl to clear them.
 *
 * Anti-SSRF on logoUrl/faviconUrl is enforced by TenantBrandService.update
 * (must startsWith R2_PUBLIC_URL). Anti-XSS on colors enforced here via
 * @IsHexColor() regex.
 */
export class UpdateBrandingDto {
  @IsOptional() @IsHexColor() primaryColor?: string;
  @IsOptional() @IsHexColor() primaryHover?: string;
  @IsOptional() @IsHexColor() secondaryColor?: string;
  @IsOptional() @IsHexColor() emailHeaderColor?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  logoUrl?: string | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  faviconUrl?: string | null;
}

/** POST /api/admin/tenant/branding/upload-url body */
export class CreateBrandingUploadUrlDto {
  /** Which asset is being uploaded */
  @IsString()
  @IsIn(['logo', 'favicon'])
  kind!: 'logo' | 'favicon';

  /** MIME type, must be in the service's allowlist (PNG/JPEG/SVG/ICO) */
  @IsString()
  contentType!: string;
}
