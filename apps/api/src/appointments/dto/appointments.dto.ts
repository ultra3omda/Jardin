import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTypeDto {
  @ApiProperty() @IsString() @MaxLength(120) name!: string;
  @ApiProperty() @IsInt() @Min(5) @Max(240) durationMin!: number;
}

export class CreateSlotDto {
  @ApiProperty() @IsString() staffUserId!: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() startsAt!: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() endsAt!: string;
}

export class BookDto {
  @ApiProperty() @IsString() slotId!: string;
  @ApiProperty() @IsString() typeId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class StatusDto {
  @ApiProperty({ enum: AppointmentStatus }) @IsEnum(AppointmentStatus) status!: AppointmentStatus;
}
