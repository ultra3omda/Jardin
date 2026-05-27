import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ───── Input DTOs ─────

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Frais de scolarité T1' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 350.0, minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  unitPrice!: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Student linked to this invoice' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  studentId?: string;

  @ApiProperty({ example: 'Facture T1 2025-2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'TND' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ example: '2025-10-31' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 175.0, minimum: 0.001 })
  @IsNumber()
  @Min(0.001)
  amount!: number;

  @ApiProperty({ example: 'cash', description: 'cash | bank_transfer | stripe | konnect' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  method!: string;

  @ApiPropertyOptional({ example: 'CHQ-2025-001' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  studentId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ───── Response DTOs ─────

export class InvoiceItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() invoiceId!: string;
  @ApiProperty() label!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() amount!: number;
}

export class PaymentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() invoiceId!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() method!: string;
  @ApiPropertyOptional() reference?: string | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() paidAt!: Date;
}

export class InvoiceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiPropertyOptional() studentId?: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() amount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ enum: InvoiceStatus }) status!: InvoiceStatus;
  @ApiProperty() dueDate!: Date;
  @ApiPropertyOptional() paidAt?: Date | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: [InvoiceItemResponseDto] }) items?: InvoiceItemResponseDto[];
  @ApiPropertyOptional({ type: [PaymentResponseDto] }) payments?: PaymentResponseDto[];
}

export class ListInvoicesResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  items!: InvoiceResponseDto[];
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
}

export class BillingDashboardStatsDto {
  @ApiProperty() totalBilled!: number;
  @ApiProperty() totalPaid!: number;
  @ApiProperty() totalPending!: number;
  @ApiProperty() totalOverdue!: number;
  @ApiProperty() overdueCount!: number;
  @ApiProperty() pendingCount!: number;
}
