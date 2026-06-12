import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashMovementKind } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OpenSessionDto {
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) openingFloat!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CloseSessionDto {
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) countedAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AddMovementDto {
  @ApiProperty({ enum: CashMovementKind }) @IsEnum(CashMovementKind) kind!: CashMovementKind;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) amount!: number;
  @ApiProperty() @IsString() @MaxLength(160) label!: string;
}

export class CreateSupplierDto {
  @ApiProperty() @IsString() @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxId?: string;
}

export class CreateExpenseDto {
  @ApiProperty() @IsString() @MaxLength(120) category!: string;
  @ApiProperty() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) amount!: number;
  @ApiProperty({ description: 'ISO date' }) @IsString() paidAt!: string;
  @ApiProperty({ description: 'cash | cheque | bank_transfer' }) @IsString() method!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supplierId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}
