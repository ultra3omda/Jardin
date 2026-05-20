import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@demo-maternelle.test' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    example: 'demo-maternelle',
    description:
      'Required only when the email matches users in multiple tenants. ' +
      'Server returns 400 with available slugs if omitted in that case.',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  tenantSlug?: string;
}
