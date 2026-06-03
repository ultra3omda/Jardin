import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import {
  AttendanceResponseDto,
  BulkAttendanceDto,
  ListAttendanceResponseDto,
  MyChildrenAttendanceResponseDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('my-children')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: "PARENT — recent attendance for the parent's children (read-only)" })
  myChildren(@CurrentUser() user: AuthenticatedUser): Promise<MyChildrenAttendanceResponseDto> {
    return this.service.myChildrenAttendance(user);
  }

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List attendance by class and date (V9)' })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  list(
    @Query('classId') classId: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListAttendanceResponseDto> {
    return this.service.listByClassAndDate(classId, date, user);
  }

  @Post('bulk')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Bulk upsert attendance for a class+date (V9)' })
  bulkUpsert(
    @Body() dto: BulkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceResponseDto[]> {
    return this.service.bulkUpsert(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a single attendance record (V9)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceResponseDto> {
    return this.service.update(id, dto, user);
  }
}
