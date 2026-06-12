import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeCategory, FeeRecurrence } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFeeTypeDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty({ enum: FeeCategory }) @IsEnum(FeeCategory) category!: FeeCategory;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) defaultAmount!: number;
  @ApiProperty({ enum: FeeRecurrence }) @IsEnum(FeeRecurrence) recurrence!: FeeRecurrence;
  @ApiPropertyOptional() @IsOptional() @IsString() level?: string;
  @ApiProperty() @IsString() schoolYear!: string;
}

export class UpdateFeeTypeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  defaultAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class BulkAssignDto {
  @ApiProperty() @IsString() feeTypeId!: string;
  @ApiPropertyOptional({ description: 'Cibler une classe' })
  @IsOptional()
  @IsString()
  classId?: string;
  @ApiPropertyOptional({ description: 'Ou cibler un niveau' })
  @IsOptional()
  @IsString()
  level?: string;
  @ApiProperty() @IsString() schoolYear!: string;
  @ApiPropertyOptional({ description: 'Surcharge du montant' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  amount?: number;
  @ApiPropertyOptional({ description: 'Avance par élève' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  advanceAmount?: number;
  @ApiProperty({ description: 'Nombre de tranches' })
  @IsInt()
  @Min(1)
  @Max(12)
  installments!: number;
}

export class RemindUnpaidDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  installmentIds!: string[];
}
