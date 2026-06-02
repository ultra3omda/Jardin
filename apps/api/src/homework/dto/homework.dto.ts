import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { SubmissionStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Devoirs (TAF) — DTOs. */

export class CreateHomeworkDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  classId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  subjectId?: string;

  @ApiProperty({ example: 'Exercices p.42' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Consigne (texte)' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  instructions!: string;

  @ApiPropertyOptional({ description: 'Pièce jointe (URL publique R2)' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  attachmentUrl?: string;

  @ApiProperty({ example: '2026-06-15', description: 'Échéance (ISO 8601)' })
  @IsDateString()
  dueDate!: string;
}

export class UpdateHomeworkDto extends PartialType(CreateHomeworkDto) {}

export class UpsertSubmissionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty({ enum: SubmissionStatus })
  @IsEnum(SubmissionStatus)
  status!: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Mot du prof' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

const ATTACHMENT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export class HomeworkAttachmentUploadDto {
  @ApiProperty({ enum: ATTACHMENT_MIMES })
  @IsString()
  @IsIn(ATTACHMENT_MIMES as unknown as string[])
  contentType!: string;
}

export class HomeworkAttachmentUploadResponseDto {
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() finalUrl!: string;
  @ApiProperty() expiresIn!: number;
}

// ── Responses ────────────────────────────────────────────────────────────────

export class HomeworkResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() className!: string;
  @ApiPropertyOptional() subjectId?: string | null;
  @ApiPropertyOptional() subjectName?: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() instructions!: string;
  @ApiPropertyOptional() attachmentUrl?: string | null;
  @ApiProperty() dueDate!: Date;
  @ApiProperty() createdById!: string;
  @ApiProperty() submissionCount!: number;
  @ApiProperty() submittedCount!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class HomeworkSubmissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty({ enum: SubmissionStatus }) status!: SubmissionStatus;
  @ApiPropertyOptional() submittedAt?: Date | null;
  @ApiPropertyOptional() feedback?: string | null;
}

export class HomeworkWithSubmissionsDto {
  @ApiProperty() homework!: HomeworkResponseDto;
  @ApiProperty({ type: [HomeworkSubmissionResponseDto] })
  submissions!: HomeworkSubmissionResponseDto[];
}

export class ListHomeworkResponseDto {
  @ApiProperty({ type: [HomeworkResponseDto] }) items!: HomeworkResponseDto[];
  @ApiProperty() total!: number;
}

/** Devoir tel que vu par un parent, avec le statut de SON enfant. */
export class ChildHomeworkDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() className!: string;
  @ApiPropertyOptional() subjectName?: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() instructions!: string;
  @ApiPropertyOptional() attachmentUrl?: string | null;
  @ApiProperty() dueDate!: Date;
  @ApiProperty({ enum: SubmissionStatus }) status!: SubmissionStatus;
}

export class ListChildHomeworkResponseDto {
  @ApiProperty({ type: [ChildHomeworkDto] }) items!: ChildHomeworkDto[];
  @ApiProperty() total!: number;
}
