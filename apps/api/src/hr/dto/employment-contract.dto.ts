import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus, ContractType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEmploymentContractDto {
  @ApiProperty({ description: 'Employee user id (TEACHER or STAFF)' })
  @IsString()
  userId!: string;

  @ApiProperty({ enum: ContractType })
  @IsEnum(ContractType)
  type!: ContractType;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({ example: '2027-08-31T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiProperty({ example: 2200.5, description: 'Base salary (TND, up to 3 decimals)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(9_999_999)
  baseSalary!: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(80)
  weeklyHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateEmploymentContractDto {
  @ApiPropertyOptional({ enum: ContractType })
  @IsOptional()
  @IsEnum(ContractType)
  type?: ContractType;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ example: '2026-09-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-08-31T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ example: 2400 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(9_999_999)
  baseSalary?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(80)
  weeklyHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListContractsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee user id' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}

export class EmploymentContractResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: ContractType }) type!: ContractType;
  @ApiProperty({ enum: ContractStatus }) status!: ContractStatus;
  @ApiProperty() startDate!: string;
  @ApiPropertyOptional() endDate?: string | null;
  @ApiProperty({ description: 'Decimal string (TND)' }) baseSalary!: string;
  @ApiProperty() currency!: string;
  @ApiPropertyOptional() weeklyHours?: number | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListContractsResponseDto {
  @ApiProperty({ type: [EmploymentContractResponseDto] })
  items!: EmploymentContractResponseDto[];

  @ApiProperty() total!: number;
}
