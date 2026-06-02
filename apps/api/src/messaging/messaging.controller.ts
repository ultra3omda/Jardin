import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ContactsResponseDto,
  ConversationResponseDto,
  CreateConversationDto,
  ListConversationsResponseDto,
  ListMessagesQueryDto,
  ListMessagesResponseDto,
  MessageResponseDto,
  SendMessageDto,
} from './dto/messaging.dto';
import { MessagingService } from './messaging.service';

/**
 * V3-B — REST endpoints messaging.
 *
 *  POST   /messaging/conversations             — create or return existing 1:1
 *  GET    /messaging/conversations              — list of my conversations
 *  GET    /messaging/conversations/:id/messages — paginated history
 *  POST   /messaging/messages                   — send a message (HTTP fallback)
 *  POST   /messaging/conversations/:id/read     — mark all as read
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Controller('messaging')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Open a 1:1 conversation (creates if missing)' })
  @ApiResponse({ status: 200, type: ConversationResponseDto })
  open(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.service.createOrGetConversation(dto, user);
  }

  @Get('conversations')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List my conversations (ordered by recent activity)' })
  @ApiResponse({ status: 200, type: ListConversationsResponseDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListConversationsResponseDto> {
    return this.service.listConversations(user);
  }

  @Get('contacts')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Users I can start a 1:1 conversation with (role-scoped)' })
  @ApiResponse({ status: 200, type: ContactsResponseDto })
  contacts(@CurrentUser() user: AuthenticatedUser): Promise<ContactsResponseDto> {
    return this.service.listContacts(user);
  }

  @Get('conversations/:id/messages')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Paginated message history (cursor by `before` message id)' })
  @ApiResponse({ status: 200, type: ListMessagesResponseDto })
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<ListMessagesResponseDto> {
    return this.service.listMessages(id, query, user);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Send a message (HTTP fallback to Socket.IO `message:send`)' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.service.sendMessage(dto, user);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.markRead(id, user);
  }
}
