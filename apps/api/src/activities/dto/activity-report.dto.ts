import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertReportDto {
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty() @IsString() summary!: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() visibleToParent?: boolean;
}

export class ReportPhotoUrlDto {
  @ApiProperty() @IsString() contentType!: string;
}
