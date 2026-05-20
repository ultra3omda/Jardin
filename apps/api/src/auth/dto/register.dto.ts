import { ApiProperty } from '@nestjs/swagger';
import { Locale, TenantType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export class RegisterTenantDto {
  @ApiProperty({ example: 'École Pilote Saint-Anne', maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'ecole-pilote-saint-anne',
    description: 'Lowercase letters, digits and hyphens. 3-63 chars.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(SLUG_REGEX, {
    message: 'slug must be lowercase letters, digits and hyphens (3-63 chars)',
  })
  slug!: string;

  @ApiProperty({ enum: TenantType })
  @IsEnum(TenantType)
  type!: TenantType;

  @ApiProperty({ enum: Locale, default: Locale.fr })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;

  @ApiProperty({ example: 'Europe/Paris', default: 'Europe/Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}

export class RegisterAdminDto {
  @ApiProperty({ example: 'directeur@ecole-pilote.fr' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    minLength: 12,
    maxLength: 128,
    description: 'Minimum 12 chars. Server hashes with bcrypt rounds 12.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: Locale, default: Locale.fr })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}

export class RegisterDto {
  @ApiProperty({ type: RegisterTenantDto })
  @ValidateNested()
  @Type(() => RegisterTenantDto)
  tenant!: RegisterTenantDto;

  @ApiProperty({ type: RegisterAdminDto })
  @ValidateNested()
  @Type(() => RegisterAdminDto)
  admin!: RegisterAdminDto;
}
