import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceEntryDto {
  @ApiProperty() @IsString() studentId!: string;
  @ApiProperty({ enum: AttendanceStatus }) @IsEnum(AttendanceStatus) status!: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class BulkAttendanceDto {
  @ApiProperty() @IsString() classId!: string;
  @ApiProperty({ description: 'YYYY-MM-DD' }) @IsDateString() date!: string;
  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class UpdateAttendanceDto {
  @ApiPropertyOptional({ enum: AttendanceStatus }) @IsOptional() @IsEnum(AttendanceStatus) status?: AttendanceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class AttendanceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional({ nullable: true }) classId!: string | null;
  @ApiProperty() date!: string;
  @ApiProperty({ enum: AttendanceStatus }) status!: AttendanceStatus;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty() recordedById!: string;
}

export class ListAttendanceResponseDto {
  @ApiProperty({ type: [AttendanceResponseDto] }) items!: AttendanceResponseDto[];
  @ApiProperty() total!: number;
}

/** Read-only attendance record for a parent's child (with the child's name). */
export class MyChildAttendanceDto {
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() date!: string;
  @ApiProperty({ enum: AttendanceStatus }) status!: AttendanceStatus;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}

export class MyChildrenAttendanceResponseDto {
  @ApiProperty({ type: [MyChildAttendanceDto] }) items!: MyChildAttendanceDto[];
  @ApiProperty() total!: number;
}
