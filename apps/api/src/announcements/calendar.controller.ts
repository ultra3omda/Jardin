import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CalendarService } from './calendar.service';
import { AttachmentUrlDto, CreateEventDto } from './dto/calendar.dto';

/** G8 — Calendrier scolaire + pièces jointes circulaires. */
@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.PARENT)
  list(@CurrentUser() u: AuthenticatedUser, @Query('schoolYear') schoolYear?: string) {
    return this.service.list(u.tenantId!, schoolYear);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Crée un événement de calendrier' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.service.create(u.tenantId!, dto);
  }

  @Post('attachment-upload-url')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @ApiOperation({ summary: 'URL signée pour joindre un PDF de circulaire' })
  attachmentUrl(@CurrentUser() u: AuthenticatedUser, @Body() dto: AttachmentUrlDto) {
    return this.service.attachmentUploadUrl(u.tenantId!, dto.contentType);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(u.tenantId!, id);
  }
}
