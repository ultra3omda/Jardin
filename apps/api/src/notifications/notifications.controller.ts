import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ListNotificationsResponseDto,
  NotificationQueryDto,
  UnreadCountResponseDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

/**
 * V8 — Notifications REST endpoints.
 *
 *  GET  /notifications              — paginated list (current user)
 *  GET  /notifications/unread-count — count of unread
 *  POST /notifications/read-all     — mark all as read
 *  POST /notifications/:id/read     — mark single notification as read
 *
 * All routes require a valid JWT (JwtAuthGuard applied globally via APP_GUARD).
 * No role restriction: every authenticated user can read their own notifications.
 *
 * IMPORTANT: literal routes (`unread-count`, `read-all`) are declared before
 * parameterised routes (`:id/read`) so NestJS does not treat the literal
 * segments as route parameter values.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user (paginated)' })
  @ApiResponse({ status: 200, type: ListNotificationsResponseDto })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NotificationQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    return this.service.findAll(user.tenantId ?? '', user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiResponse({ status: 200, type: UnreadCountResponseDto })
  unreadCount(@CurrentUser() user: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    return this.service.getUnreadCount(user.tenantId ?? '', user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  @ApiResponse({ status: 204 })
  markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.markAllRead(user.tenantId ?? '', user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Notification not found or does not belong to user' })
  markOneRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.markOneRead(user.tenantId ?? '', user.id, id);
  }
}
