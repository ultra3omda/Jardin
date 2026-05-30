import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisciplineSeverity, IncidentStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDisciplineIncidentDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() classId?: string;
  @ApiProperty({ enum: DisciplineSeverity }) @IsEnum(DisciplineSeverity) type!: DisciplineSeverity;
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() occurredAt!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(5000) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sanction?: string;
}

export class UpdateDisciplineIncidentDto {
  @ApiPropertyOptional({ enum: DisciplineSeverity })
  @IsOptional()
  @IsEnum(DisciplineSeverity)
  type?: DisciplineSeverity;

  @ApiPropertyOptional({ example: '2026-05-30' }) @IsOptional() @IsISO8601() occurredAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sanction?: string;
}

export class ResolveDisciplineIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) resolutionNote?: string;
}

export class ListDisciplineQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional({ enum: IncidentStatus }) @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
}

export class DisciplineIncidentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiPropertyOptional() classId?: string | null;
  @ApiProperty({ enum: DisciplineSeverity }) type!: DisciplineSeverity;
  @ApiProperty() occurredAt!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() sanction?: string | null;
  @ApiProperty({ enum: IncidentStatus }) status!: IncidentStatus;
  @ApiPropertyOptional() resolutionNote?: string | null;
  @ApiPropertyOptional() resolvedAt?: string | null;
  @ApiProperty() reportedById!: string;
  @ApiPropertyOptional() resolvedById?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListDisciplineResponseDto {
  @ApiProperty({ type: [DisciplineIncidentResponseDto] }) items!: DisciplineIncidentResponseDto[];
  @ApiProperty() total!: number;
}
