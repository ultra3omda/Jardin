import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import {
  AttendanceResponseDto,
  BulkAttendanceDto,
  ListAttendanceResponseDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
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
  @ApiOperation({ summary: 'Bulk upsert attendance for a class+date (V9)' })
  bulkUpsert(
    @Body() dto: BulkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceResponseDto[]> {
    return this.service.bulkUpsert(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a single attendance record (V9)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AttendanceResponseDto> {
    return this.service.update(id, dto, user);
  }
}
