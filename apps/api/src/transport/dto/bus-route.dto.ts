import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBusStopDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) order!: number;
  @ApiPropertyOptional({ example: '07:15' }) @IsOptional() @Matches(HHMM) pickupTime?: string;
}

export class CreateBusRouteDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) vehiclePlate?: string;
  @ApiProperty({ example: '07:15' }) @Matches(HHMM) departureTime!: string;
  @ApiPropertyOptional({ example: '16:45' }) @IsOptional() @Matches(HHMM) returnTime?: string;
  @ApiPropertyOptional({ enum: RouteStatus }) @IsOptional() @IsEnum(RouteStatus) status?: RouteStatus;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @IsInt() @Min(1) capacity?: number;

  @ApiPropertyOptional({ type: [CreateBusStopDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBusStopDto)
  stops?: CreateBusStopDto[];
}

export class UpdateBusRouteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) driverPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) vehiclePlate?: string;
  @ApiPropertyOptional({ example: '07:15' }) @IsOptional() @Matches(HHMM) departureTime?: string;
  @ApiPropertyOptional({ example: '16:45' }) @IsOptional() @Matches(HHMM) returnTime?: string;
  @ApiPropertyOptional({ enum: RouteStatus }) @IsOptional() @IsEnum(RouteStatus) status?: RouteStatus;
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @IsInt() @Min(1) capacity?: number;
}

export class BusStopResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() order!: number;
  @ApiPropertyOptional() pickupTime?: string | null;
}

export class BusRouteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() driverName?: string | null;
  @ApiPropertyOptional() driverPhone?: string | null;
  @ApiPropertyOptional() vehiclePlate?: string | null;
  @ApiProperty() departureTime!: string;
  @ApiPropertyOptional() returnTime?: string | null;
  @ApiProperty({ enum: RouteStatus }) status!: RouteStatus;
  @ApiPropertyOptional() capacity?: number | null;
  @ApiProperty({ type: [BusStopResponseDto] }) stops!: BusStopResponseDto[];
  @ApiProperty() assignmentCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ListBusRoutesResponseDto {
  @ApiProperty({ type: [BusRouteResponseDto] }) items!: BusRouteResponseDto[];
  @ApiProperty() total!: number;
}
