import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale, TenantType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'École Saint Pierre', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'saint-pierre',
    description: 'Slug URL-safe (lowercase, digits, hyphens). Path /t/<slug>/ + futur <slug>.klasso.tn',
    maxLength: 63,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, {
    message: 'Slug invalide : lettres minuscules, chiffres et tirets uniquement',
  })
  slug!: string;

  @ApiProperty({ enum: TenantType, example: TenantType.PRIMARY_SCHOOL })
  @IsEnum(TenantType)
  type!: TenantType;

  @ApiPropertyOptional({ enum: Locale, default: Locale.fr })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @ApiProperty({ example: 'directeur@ecole-saint-pierre.fr', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  adminEmail!: string;

  @ApiProperty({ example: 'Jean', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  adminFirstName!: string;

  @ApiProperty({ example: 'Dupont', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  adminLastName!: string;

  @ApiPropertyOptional({
    example: '#6366f1',
    description: 'Couleur primaire HEX optionnelle pour pré-brand (fallback DEFAULT_BRAND).',
  })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Si false, tenant créé sans email Resend (super_admin transmet le lien out-of-band).',
  })
  @IsOptional()
  @IsBoolean()
  sendInviteEmail?: boolean;
}
