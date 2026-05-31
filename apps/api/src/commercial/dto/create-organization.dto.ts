import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Locale, TenantType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Signed contract attached to the organization the commercial just closed. */
export class ContractInputDto {
  @ApiPropertyOptional({ example: 'KL-2026-0042', description: 'Référence interne du contrat.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reference?: string;

  @ApiProperty({
    example: 'contracts/abc123.pdf',
    description: 'Clé R2 du PDF signé (obtenue via POST /commercial/contracts/upload-url).',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  fileKey!: string;

  @ApiProperty({ example: 'contrat-ecole-saint-pierre.pdf', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: '2026-05-30', description: 'Date de signature (ISO).' })
  @IsDateString()
  signedAt!: string;

  @ApiProperty({ example: '2026-06-01', description: "Début de l'engagement (ISO)." })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-06-01', description: "Fin de l'engagement (ISO)." })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/**
 * Payload sent by a COMMERCIAL (or SUPER_ADMIN) to register a signed
 * organization: it creates the tenant (PENDING_ONBOARDING), attaches the
 * contract and emails the future SCHOOL_ADMIN an invite bound to that tenant.
 */
export class CreateOrganizationDto {
  @ApiProperty({ example: 'École Saint Pierre', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'saint-pierre',
    description: 'Slug URL-safe (lowercase, chiffres, tirets).',
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

  @ApiProperty({ type: ContractInputDto })
  @ValidateNested()
  @Type(() => ContractInputDto)
  contract!: ContractInputDto;

  @ApiPropertyOptional({
    default: true,
    description: "Si false, l'org est créée sans email Resend (lien transmis out-of-band).",
  })
  @IsOptional()
  @IsBoolean()
  sendInviteEmail?: boolean;
}
