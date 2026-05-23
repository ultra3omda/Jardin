import { ApiProperty } from '@nestjs/swagger';
import { Locale, TenantType, UserRole } from '@prisma/client';
import type { TenantBrand } from '@ecole-saas/shared';

export class UserDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) tenantId!: string | null;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: Locale }) locale!: Locale;
}

export class TenantDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: TenantType }) type!: TenantType;
  @ApiProperty({ enum: Locale }) locale!: Locale;
  @ApiProperty() timezone!: string;
  /** V1.6 — tenant white-label branding (null = use DEFAULT_BRAND).
   *  Returned by /auth/me + /auth/refresh + /auth/login so the web's
   *  (app)/layout.tsx can inject CSS vars without an extra round-trip. */
  @ApiProperty({ type: Object, nullable: true })
  brand!: TenantBrand | null;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: UserDto }) user!: UserDto;
  @ApiProperty({ type: TenantDto, nullable: true }) tenant!: TenantDto | null;
}

export class MeResponseDto {
  @ApiProperty({ type: UserDto }) user!: UserDto;
  @ApiProperty({ type: TenantDto, nullable: true }) tenant!: TenantDto | null;
}
