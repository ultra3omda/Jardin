import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InfirmaryOutcome } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInfirmaryVisitDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty({ example: '2026-05-30T09:30:00.000Z' }) @IsISO8601() visitedAt!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) treatment?: string;
  @ApiPropertyOptional({ minimum: 30, maximum: 45 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiPropertyOptional({ enum: InfirmaryOutcome })
  @IsOptional()
  @IsEnum(InfirmaryOutcome)
  outcome?: InfirmaryOutcome;
}

export class UpdateInfirmaryVisitDto {
  @ApiPropertyOptional({ example: '2026-05-30T09:30:00.000Z' })
  @IsOptional()
  @IsISO8601()
  visitedAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) treatment?: string;
  @ApiPropertyOptional({ minimum: 30, maximum: 45 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiPropertyOptional({ enum: InfirmaryOutcome })
  @IsOptional()
  @IsEnum(InfirmaryOutcome)
  outcome?: InfirmaryOutcome;
}

export class ListInfirmaryVisitsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class InfirmaryVisitResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() visitedAt!: string;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional() treatment?: string | null;
  @ApiPropertyOptional() temperature?: number | null;
  @ApiProperty({ enum: InfirmaryOutcome }) outcome!: InfirmaryOutcome;
  @ApiProperty() recordedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListInfirmaryVisitsResponseDto {
  @ApiProperty({ type: [InfirmaryVisitResponseDto] }) items!: InfirmaryVisitResponseDto[];
  @ApiProperty() total!: number;
}
