import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsMilitaryTime,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * V4 — Class / ClassTeacher / TimeSlot DTOs.
 */

export class CreateClassDto {
  @ApiProperty({ example: 'CP-A' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 'CP' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  level!: string;

  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @Matches(/^\d{4}-\d{4}$/, { message: 'schoolYear must match "YYYY-YYYY"' })
  schoolYear!: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  level?: string;
}

export class AssignTeacherDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  teacherUserId!: string;

  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  subject!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMainTeacher?: boolean;
}

export class CreateTimeSlotDto {
  @ApiProperty({ minimum: 1, maximum: 7, description: '1=Lundi, 7=Dimanche (ISO-8601)' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @ApiProperty({ example: '08:00' })
  @IsMilitaryTime()
  periodStart!: string;

  @ApiProperty({ example: '09:00' })
  @IsMilitaryTime()
  periodEnd!: string;

  @ApiProperty({ example: 'Mathématiques' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  subject!: string;

  @ApiPropertyOptional({ description: 'Optional: leave null for unassigned slots' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  teacherUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;
}

export class UpdateTimeSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMilitaryTime()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMilitaryTime()
  periodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  subject?: string;

  @ApiPropertyOptional({ description: 'null to unassign' })
  @IsOptional()
  @IsString()
  teacherUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;
}

export interface TeacherSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export class ClassTeacherResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() teacherUserId!: string;
  @ApiProperty() subject!: string;
  @ApiProperty() isMainTeacher!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() teacher?: TeacherSummary;
}

export class TimeSlotResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() dayOfWeek!: number;
  @ApiProperty() periodStart!: string;
  @ApiProperty() periodEnd!: string;
  @ApiProperty() subject!: string;
  @ApiPropertyOptional() teacherUserId?: string | null;
  @ApiPropertyOptional() room?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() teacher?: TeacherSummary | null;
}

export class ClassResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() level!: string;
  @ApiProperty() schoolYear!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: [ClassTeacherResponseDto] })
  teachers?: ClassTeacherResponseDto[];
  @ApiPropertyOptional({ type: [TimeSlotResponseDto] })
  timeSlots?: TimeSlotResponseDto[];
}

export class ListClassesResponseDto {
  @ApiProperty({ type: [ClassResponseDto] })
  items!: ClassResponseDto[];
  @ApiProperty()
  total!: number;
}
