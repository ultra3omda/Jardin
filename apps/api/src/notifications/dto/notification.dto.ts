import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Local mirror of the Prisma NotificationType enum.
 * Defined here so the DTO compiles even before `prisma generate` has been run
 * for the V8 migration. Must stay in sync with schema.prisma.
 */
export const NotificationType = {
  MESSAGE: 'MESSAGE',
  GRADE: 'GRADE',
  ATTENDANCE: 'ATTENDANCE',
  INVOICE: 'INVOICE',
  ANNOUNCEMENT: 'ANNOUNCEMENT',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/**
 * V8 — Notifications DTOs.
 *
 * Notifications are fan-out messages created by internal services
 * (no public POST endpoint) and consumed by the authenticated user via GET.
 */

// ─── Input DTOs ───────────────────────────────────────────────────────────────

export class CreateNotificationDto {
  @ApiProperty({ description: 'Target user ID' })
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ description: 'Short notification title' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Notification body text' })
  @IsString()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({
    type: Object,
    description: 'Optional metadata payload (serialized JSON)',
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class MarkReadDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs to mark as read. Omit or pass an empty array to mark ALL notifications as read.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, return only unread notifications',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ type: Object }) data?: Record<string, unknown> | null;
  @ApiPropertyOptional() readAt?: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class ListNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] }) items!: NotificationResponseDto[];
  @ApiProperty({ description: 'Total number of matching notifications' }) total!: number;
  @ApiProperty({ description: 'Count of unread notifications for this user' })
  unreadCount!: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ description: 'Number of unread notifications' }) count!: number;
}
