import { ApiProperty } from '@nestjs/swagger';

/**
 * V2 — Bulk import response DTO.
 * `row` est le numéro de ligne CSV (1-indexed, header inclus).
 */
export class CsvRowErrorDto {
  @ApiProperty({ example: 5, description: '1-indexed line number (header = line 1)' })
  row!: number;

  @ApiProperty({ example: 'dateOfBirth: YYYY-MM-DD requis' })
  message!: string;
}

export class BulkImportResponseDto {
  @ApiProperty({ description: 'Lignes effectivement insérées (0 si dryRun ou erreurs)' })
  imported!: number;

  @ApiProperty({ description: 'Lignes valides détectées' })
  valid!: number;

  @ApiProperty({ type: [CsvRowErrorDto] })
  errors!: CsvRowErrorDto[];

  @ApiProperty()
  dryRun!: boolean;
}
