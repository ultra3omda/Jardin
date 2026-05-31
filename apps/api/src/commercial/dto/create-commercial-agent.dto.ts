import { ApiProperty } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload for a SUPER_ADMIN to create a COMMERCIAL sub-admin (platform-level,
 * tenantId = null). The initial password is set here and communicated
 * out-of-band; the agent can change it later via the standard reset flow.
 */
export class CreateCommercialAgentDto {
  @ApiProperty({ example: 'commercial@klasso.tn', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Sami', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Ben Ali', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, description: 'Mot de passe initial (≥ 12 chars).' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: Locale, default: Locale.fr, required: false })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
