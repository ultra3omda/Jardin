import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVaccinationDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) vaccineName!: string;
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() administeredAt!: string;
  @ApiPropertyOptional({ example: '2027-05-30' }) @IsOptional() @IsISO8601() nextDueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateVaccinationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) vaccineName?: string;
  @ApiPropertyOptional({ example: '2026-05-30' }) @IsOptional() @IsISO8601() administeredAt?: string;
  @ApiPropertyOptional({ example: '2027-05-30' }) @IsOptional() @IsISO8601() nextDueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ListVaccinationsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
}

export class VaccinationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() vaccineName!: string;
  @ApiProperty() administeredAt!: string;
  @ApiPropertyOptional() nextDueAt?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() recordedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListVaccinationsResponseDto {
  @ApiProperty({ type: [VaccinationResponseDto] }) items!: VaccinationResponseDto[];
  @ApiProperty() total!: number;
}
