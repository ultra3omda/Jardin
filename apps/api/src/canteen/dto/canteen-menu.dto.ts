import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCanteenMenuDto {
  @ApiProperty({ example: '2026-05-30' }) @IsISO8601() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) starter?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) main?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) dessert?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) vegetarian?: string;
}

export class UpdateCanteenMenuDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) starter?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) main?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) dessert?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) vegetarian?: string;
}

export class ListCanteenMenusQueryDto {
  @ApiPropertyOptional({ example: '2026-05-25' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ example: '2026-05-31' }) @IsOptional() @IsISO8601() to?: string;
}

export class CanteenMenuResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiPropertyOptional() starter?: string | null;
  @ApiPropertyOptional() main?: string | null;
  @ApiPropertyOptional() dessert?: string | null;
  @ApiPropertyOptional() vegetarian?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListCanteenMenusResponseDto {
  @ApiProperty({ type: [CanteenMenuResponseDto] }) items!: CanteenMenuResponseDto[];
  @ApiProperty() total!: number;
}
