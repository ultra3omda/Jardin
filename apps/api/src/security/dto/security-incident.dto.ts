import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentStatus, SecurityIncidentType, SecuritySeverity } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSecurityIncidentDto {
  @ApiProperty({ enum: SecurityIncidentType })
  @IsEnum(SecurityIncidentType)
  type!: SecurityIncidentType;

  @ApiPropertyOptional({ enum: SecuritySeverity })
  @IsOptional()
  @IsEnum(SecuritySeverity)
  severity?: SecuritySeverity;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) location?: string;
  @ApiProperty({ example: '2026-05-30T10:30:00.000Z' }) @IsISO8601() occurredAt!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(5000) description!: string;
}

export class UpdateSecurityIncidentDto {
  @ApiPropertyOptional({ enum: SecurityIncidentType })
  @IsOptional()
  @IsEnum(SecurityIncidentType)
  type?: SecurityIncidentType;

  @ApiPropertyOptional({ enum: SecuritySeverity })
  @IsOptional()
  @IsEnum(SecuritySeverity)
  severity?: SecuritySeverity;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) location?: string;
  @ApiPropertyOptional({ example: '2026-05-30T10:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
}

export class ResolveSecurityIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) resolutionNote?: string;
}

export class ListSecurityIncidentsQueryDto {
  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}

export class SecurityIncidentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: SecurityIncidentType }) type!: SecurityIncidentType;
  @ApiProperty({ enum: SecuritySeverity }) severity!: SecuritySeverity;
  @ApiPropertyOptional() location?: string | null;
  @ApiProperty() occurredAt!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: IncidentStatus }) status!: IncidentStatus;
  @ApiPropertyOptional() resolutionNote?: string | null;
  @ApiPropertyOptional() resolvedAt?: string | null;
  @ApiProperty() reportedById!: string;
  @ApiPropertyOptional() resolvedById?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListSecurityIncidentsResponseDto {
  @ApiProperty({ type: [SecurityIncidentResponseDto] }) items!: SecurityIncidentResponseDto[];
  @ApiProperty() total!: number;
}
