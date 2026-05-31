import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale, TenantStatus, TenantType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { TenantBrand } from '@ecole-saas/shared';

/** Branding chosen by the org admin during the blocking onboarding wizard. */
export class OnboardingBrandDto {
  @ApiPropertyOptional({ example: '#4f46e5' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#4338ca' })
  @IsOptional()
  @IsHexColor()
  primaryHover?: string;

  @ApiPropertyOptional({ example: '#1e1b4b' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#4f46e5' })
  @IsOptional()
  @IsHexColor()
  emailHeaderColor?: string;

  @ApiPropertyOptional({ description: 'URL du logo (doit pointer vers le bucket R2 public).' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(512)
  logoUrl?: string;
}

export class CompleteOnboardingDto {
  @ApiProperty({ example: 'École Saint Pierre', maxLength: 100, description: "Nom de l'organisation (obligatoire)." })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ type: OnboardingBrandDto, description: 'Couleurs + logo (optionnels).' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OnboardingBrandDto)
  brand?: OnboardingBrandDto;
}

export class OnboardingOrganizationDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: TenantType }) type!: TenantType;
  @ApiProperty({ enum: Locale }) locale!: Locale;
  @ApiProperty({ enum: TenantStatus }) status!: TenantStatus;
}

export class OnboardingStatusDto {
  @ApiProperty({ description: 'true ⇒ wizard terminé, accès débloqué.' })
  completed!: boolean;
  @ApiProperty({ type: OnboardingOrganizationDto })
  organization!: OnboardingOrganizationDto;
  @ApiProperty({ type: Object })
  brand!: TenantBrand;
}
