import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

/**
 * V2 — Photo upload DTOs.
 * Réutilise le pattern V1.6 tenant-brand : front demande une signed PUT URL,
 * upload direct R2, puis PATCH /students/:id { photoUrl: finalUrl }.
 */
export class PhotoUploadUrlDto {
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType!: 'image/jpeg' | 'image/png' | 'image/webp';
}

export class PhotoUploadResponseDto {
  @ApiProperty({ description: 'Signed PUT URL (TTL 5 min) — PUT direct to R2' })
  uploadUrl!: string;

  @ApiProperty({ description: 'Final public URL — PATCH /students/:id { photoUrl } afterwards' })
  finalUrl!: string;

  @ApiProperty({ description: 'TTL in seconds for the signed PUT URL' })
  expiresIn!: number;
}
