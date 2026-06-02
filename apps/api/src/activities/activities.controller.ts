import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ActivityResponseDto,
  AddParticipationDto,
  CreateActivityDto,
  ListActivitiesResponseDto,
  ParticipationResponseDto,
  UpdateActivityDto,
} from './dto/activity.dto';
import { ActivitiesService } from './activities.service';

/** T2b — Activités périscolaires + participations. */
@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'List the activity catalogue (with participant counts)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListActivitiesResponseDto> {
    return this.service.list(user);
  }

  @Get(':id/participations')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  participations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ParticipationResponseDto[]> {
    return this.service.listParticipations(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActivityDto): Promise<ActivityResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }

  @Post(':id/participations')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  addParticipation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddParticipationDto,
  ): Promise<ParticipationResponseDto> {
    return this.service.addParticipation(id, dto, user);
  }

  @Post(':id/participations/fill-from-attendance')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Auto-remplir les participations depuis les présents du jour (classe de l\'atelier)' })
  fillFromAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('date') date?: string,
  ): Promise<ParticipationResponseDto[]> {
    return this.service.fillFromAttendance(id, date, user);
  }

  @Delete(':id/participations/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  removeParticipation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    return this.service.removeParticipation(id, studentId, user);
  }
}
