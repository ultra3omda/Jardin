import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GenerateBulletinDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  gradePeriodId!: string;
}

export interface BulletinGradeEntryDto {
  evalTitle: string;
  date: string;
  score: number;
  maxScore: number;
  scaledScore: number;
}

export interface BulletinSubjectEntryDto {
  subjectId: string;
  subjectName: string;
  grades: BulletinGradeEntryDto[];
  average: number | null;
}

export interface BulletinSnapshotDto {
  student: { id: string; firstName: string; lastName: string; classroom: string };
  period: { id: string; name: string; schoolYear: string };
  schoolName: string;
  subjects: BulletinSubjectEntryDto[];
  overallAverage: number | null;
  generatedAt: string;
}

export class BulletinResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() gradePeriodId!: string;
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() generatedById!: string;
  @ApiPropertyOptional() pdfUrl?: string | null;
}

/** One generated bulletin available for download (parent view). */
export interface ChildBulletinEntryDto {
  gradePeriodId: string;
  gradePeriodName: string;
  schoolYear: string;
  generatedAt: string;
}

/** A parent's child with the list of its officially generated bulletins. */
export interface ChildBulletinsDto {
  studentId: string;
  studentName: string;
  className: string;
  bulletins: ChildBulletinEntryDto[];
}
