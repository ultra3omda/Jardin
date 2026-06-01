import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityCategory } from '@prisma/client';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ enum: ActivityCategory }) @IsOptional() @IsEnum(ActivityCategory) category?: ActivityCategory;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1440 }) @IsOptional() @IsInt() @Min(1) @Max(1440) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) location?: string;
  @ApiPropertyOptional({ description: 'Enseignant/animateur responsable (userId), ou null pour aucun.' })
  @IsOptional() @IsString() @MaxLength(40) responsibleUserId?: string | null;
}

export class UpdateActivityDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ enum: ActivityCategory }) @IsOptional() @IsEnum(ActivityCategory) category?: ActivityCategory;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() scheduledAt?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 1440 }) @IsOptional() @IsInt() @Min(1) @Max(1440) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) location?: string;
  @ApiPropertyOptional({ description: 'Enseignant/animateur responsable (userId), ou null pour aucun.' })
  @IsOptional() @IsString() @MaxLength(40) responsibleUserId?: string | null;
}

export class AddParticipationDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
}

export class ParticipationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
}

export class ActivityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty({ enum: ActivityCategory }) category!: ActivityCategory;
  @ApiPropertyOptional() scheduledAt?: string | null;
  @ApiPropertyOptional() durationMin?: number | null;
  @ApiPropertyOptional() location?: string | null;
  @ApiPropertyOptional() responsibleUserId?: string | null;
  @ApiPropertyOptional() responsibleName?: string | null;
  @ApiProperty() participantCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListActivitiesResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] }) items!: ActivityResponseDto[];
  @ApiProperty() total!: number;
}
