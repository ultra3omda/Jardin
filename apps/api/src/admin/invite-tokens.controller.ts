import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { CreateInviteTokenDto } from './dto/create-invite-token.dto';
import {
  InviteTokenCreatedDto,
  InviteTokenListItemDto,
  InviteTokenStatus,
} from './dto/invite-token-response.dto';
import { InviteTokensService } from './invite-tokens.service';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/invite-tokens')
export class InviteTokensController {
  constructor(private readonly inviteTokens: InviteTokensService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Mint a new invite token (SUPER_ADMIN only)',
    description:
      'Generates a single-use registration token. The plaintext token + URL are returned ONCE — store them now or they are lost forever (only the SHA-256 hash is persisted).',
  })
  @ApiResponse({ status: 201, type: InviteTokenCreatedDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInviteTokenDto,
    @Req() req: Request,
  ): Promise<InviteTokenCreatedDto> {
    return this.inviteTokens.create(user.id, dto, getRequestMeta(req));
  }

  @Get()
  @ApiOperation({ summary: 'List all invite tokens with derived status (SUPER_ADMIN only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'consumed', 'expired'] })
  @ApiResponse({ status: 200, type: [InviteTokenListItemDto] })
  async list(@Query('status') status?: InviteTokenStatus): Promise<InviteTokenListItemDto[]> {
    return this.inviteTokens.list(status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an invite token (SUPER_ADMIN only)',
    description: 'Forces the token to be expired. The row is preserved for audit purposes.',
  })
  @ApiResponse({ status: 204 })
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.inviteTokens.revoke(id, user.id, getRequestMeta(req));
  }
}
