import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'Filtre sur le nom de l’action (contient)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @ApiPropertyOptional({ description: 'Filtre exact sur la ressource' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  resource?: string;

  @ApiPropertyOptional({ description: 'Filtre par établissement (tenantId)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filtre par utilisateur acteur (userId)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @ApiPropertyOptional({ description: 'Borne basse de date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Borne haute de date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class AuditEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() action!: string;
  @ApiProperty() resource!: string;
  @ApiPropertyOptional({ nullable: true }) tenantId!: string | null;
  @ApiPropertyOptional({ nullable: true }) tenantSlug!: string | null;
  @ApiPropertyOptional({ nullable: true }) tenantName!: string | null;
  @ApiPropertyOptional({ nullable: true }) userId!: string | null;
  @ApiPropertyOptional({ nullable: true }) userEmail!: string | null;
  @ApiPropertyOptional({ nullable: true }) ip!: string | null;
  @ApiPropertyOptional({ nullable: true, type: Object }) metadata!: unknown;
  @ApiProperty() createdAt!: string;
}

export class AuditListDto {
  @ApiProperty({ type: [AuditEntryDto] }) items!: AuditEntryDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
