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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import {
  AssignTeacherDto,
  ClassResponseDto,
  ClassTeacherResponseDto,
  CreateClassDto,
  CreateTimeSlotDto,
  ListClassesResponseDto,
  MyScheduleResponseDto,
  TimeSlotResponseDto,
  UpdateClassDto,
  UpdateTimeSlotDto,
} from './dto/class.dto';

/**
 * V4 — Classes + Teachers assignments + EDT TimeSlots.
 */
@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List classes (optionally filter by schoolYear)' })
  @ApiResponse({ status: 200, type: ListClassesResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('schoolYear') schoolYear?: string,
  ): Promise<ListClassesResponseDto> {
    return this.service.list(user, schoolYear);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a class (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: ClassResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClassDto,
  ): Promise<ClassResponseDto> {
    return this.service.create(dto, user);
  }

  @Get('my-schedule')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: "The caller's own timetable across all their classes" })
  @ApiResponse({ status: 200, type: MyScheduleResponseDto })
  mySchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Query('schoolYear') schoolYear?: string,
  ): Promise<MyScheduleResponseDto> {
    return this.service.mySchedule(user, schoolYear);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Get class detail (incl. teachers + timeSlots)' })
  @ApiResponse({ status: 200, type: ClassResponseDto })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ClassResponseDto> {
    return this.service.findById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update class name/level (SCHOOL_ADMIN)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ): Promise<ClassResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft-delete class (SCHOOL_ADMIN)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }

  @Post(':id/teachers')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Assign a teacher to the class (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: ClassTeacherResponseDto })
  assignTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignTeacherDto,
  ): Promise<ClassTeacherResponseDto> {
    return this.service.assignTeacher(id, dto, user);
  }

  @Delete('teachers/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Remove a teacher assignment (SCHOOL_ADMIN)' })
  unassignTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId') assignmentId: string,
  ): Promise<void> {
    return this.service.unassignTeacher(assignmentId, user);
  }

  @Post(':id/timeslots')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Add a weekly recurring time slot to the class (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: TimeSlotResponseDto })
  createTimeSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateTimeSlotDto,
  ): Promise<TimeSlotResponseDto> {
    return this.service.createTimeSlot(id, dto, user);
  }

  @Patch('timeslots/:slotId')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a time slot (SCHOOL_ADMIN)' })
  updateTimeSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slotId') slotId: string,
    @Body() dto: UpdateTimeSlotDto,
  ): Promise<TimeSlotResponseDto> {
    return this.service.updateTimeSlot(slotId, dto, user);
  }

  @Delete('timeslots/:slotId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete a time slot (SCHOOL_ADMIN)' })
  deleteTimeSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slotId') slotId: string,
  ): Promise<void> {
    return this.service.deleteTimeSlot(slotId, user);
  }
}
