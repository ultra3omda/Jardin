import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DrillType } from '@prisma/client';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateSafetyDrillDto {
  @ApiProperty({ enum: DrillType }) @IsEnum(DrillType) type!: DrillType;
  @ApiProperty({ example: '2026-05-30T11:00:00.000Z' }) @IsISO8601() conductedAt!: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMin?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateSafetyDrillDto {
  @ApiPropertyOptional({ enum: DrillType }) @IsOptional() @IsEnum(DrillType) type?: DrillType;
  @ApiPropertyOptional({ example: '2026-05-30T11:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  conductedAt?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMin?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class SafetyDrillResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: DrillType }) type!: DrillType;
  @ApiProperty() conductedAt!: string;
  @ApiPropertyOptional() durationMin?: number | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() recordedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListSafetyDrillsResponseDto {
  @ApiProperty({ type: [SafetyDrillResponseDto] }) items!: SafetyDrillResponseDto[];
  @ApiProperty() total!: number;
}
