import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVisitorLogDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(160) visitorName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @ApiProperty({ example: '2026-05-30T08:15:00.000Z' }) @IsISO8601() checkInAt!: string;
  @ApiPropertyOptional({ example: '2026-05-30T09:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  checkOutAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) badgeNumber?: string;
}

export class UpdateVisitorLogDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) visitorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @ApiPropertyOptional({ example: '2026-05-30T08:15:00.000Z' })
  @IsOptional()
  @IsISO8601()
  checkInAt?: string;

  @ApiPropertyOptional({ example: '2026-05-30T09:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  checkOutAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) badgeNumber?: string;
}

export class VisitorLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() visitorName!: string;
  @ApiPropertyOptional() reason?: string | null;
  @ApiProperty() checkInAt!: string;
  @ApiPropertyOptional() checkOutAt?: string | null;
  @ApiPropertyOptional() badgeNumber?: string | null;
  @ApiProperty() recordedById!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListVisitorLogsResponseDto {
  @ApiProperty({ type: [VisitorLogResponseDto] }) items!: VisitorLogResponseDto[];
  @ApiProperty() total!: number;
}
