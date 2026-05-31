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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateVisitorLogDto,
  ListVisitorLogsResponseDto,
  UpdateVisitorLogDto,
  VisitorLogResponseDto,
} from './dto/visitor-log.dto';
import { VisitorLogsService } from './visitor-logs.service';

/**
 * T2b — Journal des visiteurs (niveau école).
 * RBAC : SCHOOL_ADMIN + STAFF. PARENT/TEACHER : aucun accès.
 */
@ApiTags('visitor-logs')
@ApiBearerAuth()
@Controller('visitor-logs')
export class VisitorLogsController {
  constructor(private readonly service: VisitorLogsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List visitor logs' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListVisitorLogsResponseDto> {
    return this.service.list(user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<VisitorLogResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVisitorLogDto,
  ): Promise<VisitorLogResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVisitorLogDto,
  ): Promise<VisitorLogResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
