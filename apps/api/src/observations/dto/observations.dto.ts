import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ObservationCategory, ObservationMediaKind } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MediaRefDto {
  @ApiProperty({ enum: ObservationMediaKind })
  @IsEnum(ObservationMediaKind)
  kind!: ObservationMediaKind;

  @ApiProperty() @IsString() url!: string;
}

export class CreateObservationDto {
  @ApiProperty() @IsString() studentId!: string;
  @ApiProperty({ enum: ObservationCategory })
  @IsEnum(ObservationCategory)
  category!: ObservationCategory;
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() content!: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() observedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() visibleToParent?: boolean;
  @ApiPropertyOptional({ type: [MediaRefDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaRefDto)
  media?: MediaRefDto[];
}

export class UpdateObservationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional({ enum: ObservationCategory })
  @IsOptional()
  @IsEnum(ObservationCategory)
  category?: ObservationCategory;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() visibleToParent?: boolean;
}

export class BulkObservationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studentIds!: string[];
  @ApiProperty({ enum: ObservationCategory })
  @IsEnum(ObservationCategory)
  category!: ObservationCategory;
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() content!: string;
  @ApiProperty({ description: 'ISO datetime' }) @IsString() observedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() visibleToParent?: boolean;
}

export class MediaUploadUrlDto {
  @ApiProperty() @IsString() contentType!: string;
}
