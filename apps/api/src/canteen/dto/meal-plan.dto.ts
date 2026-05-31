import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealRegime } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMealPlanDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiPropertyOptional({ enum: MealRegime }) @IsOptional() @IsEnum(MealRegime) regime?: MealRegime;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) allergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateMealPlanDto {
  @ApiPropertyOptional({ enum: MealRegime }) @IsOptional() @IsEnum(MealRegime) regime?: MealRegime;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) allergies?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ListMealPlansQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class MealPlanResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty({ enum: MealRegime }) regime!: MealRegime;
  @ApiPropertyOptional() allergies?: string | null;
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListMealPlansResponseDto {
  @ApiProperty({ type: [MealPlanResponseDto] }) items!: MealPlanResponseDto[];
  @ApiProperty() total!: number;
}
