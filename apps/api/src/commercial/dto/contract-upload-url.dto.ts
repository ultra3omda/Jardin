import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** Allowed MIME types for a signed contract upload (PDF only for now). */
export const CONTRACT_CONTENT_TYPES = ['application/pdf'] as const;

export class ContractUploadUrlDto {
  @ApiProperty({ example: 'contrat-ecole-saint-pierre.pdf', maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ enum: CONTRACT_CONTENT_TYPES, example: 'application/pdf' })
  @IsIn(CONTRACT_CONTENT_TYPES as unknown as string[])
  contentType!: string;
}

export class ContractUploadUrlResponseDto {
  @ApiProperty({ description: 'URL R2 présignée (PUT) — valable 5 minutes.' })
  uploadUrl!: string;

  @ApiProperty({ description: 'Clé R2 à renvoyer dans contract.fileKey à la création.' })
  fileKey!: string;
}
