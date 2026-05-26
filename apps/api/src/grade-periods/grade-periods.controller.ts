import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateGradePeriodDto,
  GradePeriodResponseDto,
  ListGradePeriodsResponseDto,
  UpdateGradePeriodDto,
} from './dto/grade-period.dto';
import { GradePeriodsService } from './grade-periods.service';

/** V6 — Grade periods (trimestres / semestres). */
@ApiTags('grade-periods')
@ApiBearerAuth()
@Controller('grade-periods')
export class GradePeriodsController {
  constructor(private readonly service: GradePeriodsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List grade periods (optional ?schoolYear=...)' })
  @ApiResponse({ status: 200, type: ListGradePeriodsResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('schoolYear') schoolYear?: string,
  ): Promise<ListGradePeriodsResponseDto> {
    return this.service.list(user, schoolYear);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a grade period (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: GradePeriodResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGradePeriodDto,
  ): Promise<GradePeriodResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a grade period (SCHOOL_ADMIN)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGradePeriodDto,
  ): Promise<GradePeriodResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Post(':id/close')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Close a grade period — no more grade edits (SCHOOL_ADMIN)' })
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<GradePeriodResponseDto> {
    return this.service.close(id, user);
  }
}
