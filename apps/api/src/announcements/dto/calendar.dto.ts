import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarEventType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @ApiProperty() @IsString() @MaxLength(160) title!: string;
  @ApiProperty({ enum: CalendarEventType }) @IsEnum(CalendarEventType) type!: CalendarEventType;
  @ApiProperty({ description: 'ISO date' }) @IsString() startDate!: string;
  @ApiProperty({ description: 'ISO date' }) @IsString() endDate!: string;
  @ApiProperty() @IsString() schoolYear!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AttachmentUrlDto {
  @ApiProperty() @IsString() contentType!: string;
}
