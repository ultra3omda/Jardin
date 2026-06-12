import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDishDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}

export class UpdateDishDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredients?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}

export class ReserveDto {
  @ApiProperty() @IsString() studentId!: string;
  @ApiProperty({ description: 'ISO date' }) @IsString() date!: string;
}

export class ReserveClassDto {
  @ApiProperty() @IsString() classId!: string;
  @ApiProperty({ description: 'ISO date' }) @IsString() date!: string;
}

export class UpdateReservationDto {
  @ApiProperty({ enum: ReservationStatus }) @IsEnum(ReservationStatus) status!: ReservationStatus;
}
