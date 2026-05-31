import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayslipComponentKind, PayslipStatus } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GeneratePayslipDto {
  @ApiProperty({ description: 'Employee user id (TEACHER or STAFF)' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: '2026-05', description: 'Period month (YYYY-MM)' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period must be YYYY-MM' })
  period!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AddPayslipComponentDto {
  @ApiProperty({ example: 'Prime de rentrée' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label!: string;

  @ApiProperty({ enum: PayslipComponentKind })
  @IsEnum(PayslipComponentKind)
  kind!: PayslipComponentKind;

  @ApiProperty({ example: 150, description: 'Amount (TND, up to 3 decimals)' })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(9_999_999)
  amount!: number;
}

export class ListPayslipsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee id (admins only)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-05' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period must be YYYY-MM' })
  period?: string;
}

export class PayslipComponentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ enum: PayslipComponentKind }) kind!: PayslipComponentKind;
  @ApiProperty({ description: 'Decimal string (TND)' }) amount!: string;
}

export class PayslipResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() period!: string;
  @ApiProperty({ description: 'Decimal string (TND)' }) baseSalary!: string;
  @ApiProperty({ description: 'Decimal string (TND)' }) grossSalary!: string;
  @ApiProperty({ description: 'Decimal string (TND)' }) totalDeductions!: string;
  @ApiProperty({ description: 'Decimal string (TND)' }) netSalary!: string;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: PayslipStatus }) status!: PayslipStatus;
  @ApiPropertyOptional() issuedAt?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty({ type: [PayslipComponentResponseDto] }) components!: PayslipComponentResponseDto[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListPayslipsResponseDto {
  @ApiProperty({ type: [PayslipResponseDto] }) items!: PayslipResponseDto[];
  @ApiProperty() total!: number;
}
