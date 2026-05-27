import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementResponseDto,
  CreateAnnouncementDto,
  ListAnnouncementsResponseDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

@ApiTags('announcements')
@ApiBearerAuth('access-token')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'List announcements for the tenant (V9)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListAnnouncementsResponseDto> {
    return this.service.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Create announcement (V9)' })
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AnnouncementResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update announcement (V9)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AnnouncementResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete announcement (soft, V9)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.service.remove(id, user);
  }
}
