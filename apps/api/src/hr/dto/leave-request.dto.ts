import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveStatus, LeaveType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'Employee id; admins only. Defaults to the caller.' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ enum: LeaveType })
  @IsEnum(LeaveType)
  type!: LeaveType;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @IsISO8601()
  startDate!: string;

  @ApiProperty({ example: '2026-07-10T00:00:00.000Z' })
  @IsISO8601()
  endDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class ReviewLeaveRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(LeaveStatus)
  status!: Extract<LeaveStatus, 'APPROVED' | 'REJECTED'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

export class ListLeavesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee id (admins only)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: LeaveStatus })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;
}

export class LeaveBalanceQueryDto {
  @ApiPropertyOptional({ description: 'Employee id (admins only); defaults to the caller' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100, description: 'Calendar year' })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

export class LeaveRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: LeaveType }) type!: LeaveType;
  @ApiProperty({ enum: LeaveStatus }) status!: LeaveStatus;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() days!: number;
  @ApiPropertyOptional() reason?: string | null;
  @ApiPropertyOptional() reviewNote?: string | null;
  @ApiPropertyOptional() reviewedById?: string | null;
  @ApiPropertyOptional() reviewedAt?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListLeavesResponseDto {
  @ApiProperty({ type: [LeaveRequestResponseDto] }) items!: LeaveRequestResponseDto[];
  @ApiProperty() total!: number;
}

export class LeaveBalanceResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() year!: number;
  @ApiProperty({ description: 'Annual paid-leave allowance (days)' }) allowanceDays!: number;
  @ApiProperty({ description: 'Approved paid-leave days taken this year' }) takenDays!: number;
  @ApiProperty({ description: 'Remaining paid-leave days' }) remainingDays!: number;
}
