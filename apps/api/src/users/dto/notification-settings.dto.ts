import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/**
 * V10 — Register/refresh the caller's Expo push token (mobile devices).
 * The token is stored on the User row and consumed by ExpoPushService.
 */
export class UpdatePushTokenDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 255,
    description: 'Expo push token (e.g. ExponentPushToken[xxxxxxxx])',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @Length(1, 255)
  token!: string;
}

/**
 * V10 — Partial update of the caller's notification delivery preferences.
 * Omitted fields are left unchanged. The in-app channel is always on.
 */
export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable mobile push notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}

/** V10 — Current notification preferences for the authenticated user. */
export class NotificationPreferencesResponseDto {
  @ApiProperty({ description: 'Mobile push notifications enabled' })
  pushEnabled!: boolean;

  @ApiProperty({ description: 'Email notifications enabled' })
  emailNotificationsEnabled!: boolean;

  @ApiProperty({ description: 'Whether a push token is currently registered' })
  pushRegistered!: boolean;
}
