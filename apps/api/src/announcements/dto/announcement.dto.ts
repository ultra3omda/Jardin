import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AnnouncementAudience, AnnouncementKind } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({ maxLength: 200 })
  @IsString() @MinLength(1) @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString() @MinLength(1)
  body!: string;

  @ApiPropertyOptional({ enum: AnnouncementAudience, default: 'ALL' })
  @IsOptional() @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  @ApiPropertyOptional({ enum: AnnouncementKind, default: 'NEWS' })
  @IsOptional() @IsEnum(AnnouncementKind)
  kind?: AnnouncementKind;

  @ApiPropertyOptional({ description: 'PDF joint (R2) pour une circulaire' })
  @IsOptional() @IsString()
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: 'ISO date string, defaults to now' })
  @IsOptional() @IsDateString()
  publishAt?: string;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(1)
  body?: string;

  @ApiPropertyOptional({ enum: AnnouncementAudience })
  @IsOptional() @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  publishAt?: string;
}

export class AnnouncementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: AnnouncementAudience }) audience!: AnnouncementAudience;
  @ApiProperty({ enum: AnnouncementKind }) kind!: AnnouncementKind;
  @ApiPropertyOptional({ nullable: true }) attachmentUrl!: string | null;
  @ApiProperty() authorId!: string;
  @ApiProperty() authorName!: string;
  @ApiProperty() publishAt!: Date;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListAnnouncementsResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] }) items!: AnnouncementResponseDto[];
  @ApiProperty() total!: number;
}
