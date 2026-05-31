import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportDirection } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTransportAssignmentDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty() @IsString() @MinLength(1) routeId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stopId?: string;
  @ApiPropertyOptional({ enum: TransportDirection })
  @IsOptional()
  @IsEnum(TransportDirection)
  direction?: TransportDirection;
}

export class UpdateTransportAssignmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() stopId?: string;
  @ApiPropertyOptional({ enum: TransportDirection })
  @IsOptional()
  @IsEnum(TransportDirection)
  direction?: TransportDirection;
}

export class ListTransportAssignmentsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() routeId?: string;
}

export class TransportAssignmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() studentName!: string;
  @ApiProperty() routeId!: string;
  @ApiProperty() routeName!: string;
  @ApiPropertyOptional() stopId?: string | null;
  @ApiPropertyOptional() stopName?: string | null;
  @ApiProperty({ enum: TransportDirection }) direction!: TransportDirection;
  @ApiProperty() createdAt!: string;
}

export class ListTransportAssignmentsResponseDto {
  @ApiProperty({ type: [TransportAssignmentResponseDto] }) items!: TransportAssignmentResponseDto[];
  @ApiProperty() total!: number;
}
