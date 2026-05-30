import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateDailyLogDto,
  DailyLogResponseDto,
  ListJournalQueryDto,
  ListJournalResponseDto,
  UpdateDailyLogDto,
} from './dto/journal.dto';
import { JournalService } from './journal.service';

/** T2b — Journal quotidien (cahier de liaison). */
@ApiTags('journal')
@ApiBearerAuth()
@Controller('journal')
export class JournalController {
  constructor(private readonly service: JournalService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'List daily log entries (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListJournalQueryDto,
  ): Promise<ListJournalResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<DailyLogResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDailyLogDto,
  ): Promise<DailyLogResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDailyLogDto,
  ): Promise<DailyLogResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
