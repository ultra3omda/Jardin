import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChildMood } from '@prisma/client';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDailyLogDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) meals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) nap?: string;
  @ApiPropertyOptional({ enum: ChildMood }) @IsOptional() @IsEnum(ChildMood) mood?: ChildMood;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) bathroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) activitiesNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) generalNote?: string;
  @ApiPropertyOptional({ description: 'Photo du jour (URL publique R2)' })
  @IsOptional() @IsString() @MaxLength(1000) photoUrl?: string;
}

export class UpdateDailyLogDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) meals?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) nap?: string;
  @ApiPropertyOptional({ enum: ChildMood }) @IsOptional() @IsEnum(ChildMood) mood?: ChildMood;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) bathroom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) activitiesNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) generalNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) photoUrl?: string;
}

export class ListJournalQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional({ example: '2026-05-30' }) @IsOptional() @IsISO8601() date?: string;
}

export class DailyLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() date!: string;
  @ApiPropertyOptional() meals?: string | null;
  @ApiPropertyOptional() nap?: string | null;
  @ApiPropertyOptional({ enum: ChildMood }) mood?: ChildMood | null;
  @ApiPropertyOptional() bathroom?: string | null;
  @ApiPropertyOptional() activitiesNote?: string | null;
  @ApiPropertyOptional() generalNote?: string | null;
  @ApiPropertyOptional() photoUrl?: string | null;
  @ApiProperty() authorId!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListJournalResponseDto {
  @ApiProperty({ type: [DailyLogResponseDto] }) items!: DailyLogResponseDto[];
  @ApiProperty() total!: number;
}

const JOURNAL_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class JournalPhotoUploadDto {
  @ApiProperty({ enum: JOURNAL_PHOTO_MIMES })
  @IsString()
  @IsIn(JOURNAL_PHOTO_MIMES as unknown as string[])
  contentType!: string;
}

export class JournalPhotoUploadResponseDto {
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() finalUrl!: string;
  @ApiProperty() expiresIn!: number;
}
