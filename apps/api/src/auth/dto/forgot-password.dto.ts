import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@ecole-pilote.fr' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /**
   * Optional: pin the password-reset email to a specific tenant when the
   * email belongs to multiple tenants. If omitted and the email matches
   * several accounts, a reset email is sent to ALL of them (still 204).
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(SLUG_REGEX)
  tenantSlug?: string;
}
