import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { MeResponseDto, TenantDto } from '../auth/dto/auth-response.dto';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  NotificationPreferencesResponseDto,
  UpdateNotificationPreferencesDto,
  UpdatePushTokenDto,
} from './dto/notification-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ExportService, type ExportResult } from './export.service';
import { SessionsService, type SessionListItem } from './sessions.service';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly exports: ExportService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated user and tenant (V1.5)' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    const { user: u, tenant } = await this.users.findMe(user.id);
    return {
      user: {
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        locale: u.locale,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            type: tenant.type,
            locale: tenant.locale,
            timezone: tenant.timezone,
            // V1.6 — pass-through raw JSONB brand; web layout merges over DEFAULT_BRAND.
            brand: (tenant.brand ?? null) as TenantDto['brand'],
          }
        : null,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<MeResponseDto> {
    await this.users.updateProfile(user.id, dto, getRequestMeta(req));
    return this.getMe(user);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Change the authenticated user password',
    description:
      'Validates the current password, sets the new bcrypt hash, and revokes ALL active sessions including the current one. The client must re-login.',
  })
  @ApiResponse({ status: 204 })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.users.changePassword(user.id, dto, getRequestMeta(req));
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'List active refresh-token sessions for the user' })
  @ApiResponse({ status: 200 })
  async listSessions(@CurrentUser() user: AuthenticatedUser): Promise<SessionListItem[]> {
    return this.sessions.list(user.id);
  }

  @Delete('me/sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 204 })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.sessions.revoke(user.id, id, getRequestMeta(req));
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete the authenticated user (RGPD-compatible)',
    description:
      'Marks the user as deleted and revokes all active sessions. The row is preserved for audit purposes.',
  })
  @ApiResponse({ status: 204 })
  async deleteMe(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.users.softDelete(user.id, getRequestMeta(req));
  }

  @Post('me/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a RGPD-compatible data export (V1.5)',
    description:
      'Builds a ZIP of all data stored about the user, uploads it to R2, returns a pre-signed download URL valid 24h, and emails the URL to the user. Throws 503 R2_NOT_CONFIGURED if object storage is not provisioned.',
  })
  @ApiResponse({ status: 200 })
  async exportData(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<ExportResult> {
    return this.exports.exportForUser(user.id, getRequestMeta(req));
  }

  // ───── V10 — Push token & notification preferences ─────

  @Put('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Register or refresh the Expo push token (V10)',
    description: 'Stores the caller mobile device push token for notification delivery.',
  })
  @ApiResponse({ status: 204 })
  async setPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePushTokenDto,
  ): Promise<void> {
    await this.users.setPushToken(user.id, dto.token);
  }

  @Delete('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear the registered Expo push token (V10)',
    description: 'Removes the push token, e.g. on logout or device change.',
  })
  @ApiResponse({ status: 204 })
  async clearPushToken(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.users.clearPushToken(user.id);
  }

  @Get('me/notification-preferences')
  @ApiOperation({ summary: 'Read notification delivery preferences (V10)' })
  @ApiResponse({ status: 200, type: NotificationPreferencesResponseDto })
  async getNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.users.getNotificationPreferences(user.id);
  }

  @Patch('me/notification-preferences')
  @ApiOperation({ summary: 'Update notification delivery preferences (V10)' })
  @ApiResponse({ status: 200, type: NotificationPreferencesResponseDto })
  async updateNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.users.updateNotificationPreferences(user.id, dto);
  }
}
