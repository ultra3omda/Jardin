import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DemoRequestDto {
  @ApiProperty({ example: 'Karim', maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Ben Salem', maxLength: 100 })
  @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;

  @ApiProperty({ example: 'directeur@ecole-exemple.tn', maxLength: 254 })
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ example: '+216 12 345 678' })
  @IsOptional() @IsString() @Matches(/^\+?[\d\s-]{8,20}$/, { message: 'Format téléphone invalide' })
  phone?: string;

  @ApiProperty({ example: 'École Primaire Ibn Khaldoun', maxLength: 200 })
  @IsString() @MinLength(2) @MaxLength(200)
  schoolName!: string;

  @ApiProperty({ enum: ['<50', '50-200', '200-500', '500+'], example: '50-200' })
  @IsIn(['<50', '50-200', '200-500', '500+'])
  studentsCount!: '<50' | '50-200' | '200-500' | '500+';

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;

  @ApiProperty({ enum: ['fr', 'ar'], default: 'fr' })
  @IsIn(['fr', 'ar'])
  locale!: 'fr' | 'ar';

  @ApiProperty({ description: 'Cloudflare Turnstile token' })
  @IsString() @MinLength(10)
  turnstileToken!: string;
}
