import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEvaluationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  classId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  subjectId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  gradePeriodId!: string;

  @ApiProperty({ example: 'Contrôle chap. 3' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: '2025-10-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 20, minimum: 0.01, maximum: 1000 })
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  maxScore!: number;
}

export class UpdateEvaluationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ minimum: 0.01, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  maxScore?: number;
}

export class UpsertGradeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty({ example: 14.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  score!: number;
}

export class EvaluationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty() gradePeriodId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() date!: Date;
  @ApiProperty() maxScore!: number;
  @ApiProperty() createdById!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class GradeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() evaluationId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() score!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListEvaluationsResponseDto {
  @ApiProperty({ type: [EvaluationResponseDto] })
  items!: EvaluationResponseDto[];
  @ApiProperty()
  total!: number;
}

export class EvaluationWithGradesResponseDto {
  @ApiProperty({ type: EvaluationResponseDto })
  evaluation!: EvaluationResponseDto;
  @ApiProperty({ type: [GradeResponseDto] })
  grades!: GradeResponseDto[];
}
