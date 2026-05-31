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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { LeavesService } from './leaves.service';
import {
  CreateLeaveRequestDto,
  LeaveBalanceQueryDto,
  LeaveBalanceResponseDto,
  LeaveRequestResponseDto,
  ListLeavesQueryDto,
  ListLeavesResponseDto,
  ReviewLeaveRequestDto,
} from './dto/leave-request.dto';

/**
 * T2c V2 — Demandes de congés.
 * RBAC : tout employé (TEACHER/STAFF) ou admin peut demander/consulter (les siens) ;
 * seul un SCHOOL_ADMIN/SUPER_ADMIN approuve/rejette, et jamais ses propres congés.
 */
@ApiTags('hr-leaves')
@ApiBearerAuth('access-token')
@Controller('hr/leaves')
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List leave requests (admins: all/by employee; employees: own)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLeavesQueryDto,
  ): Promise<ListLeavesResponseDto> {
    return this.service.list(query, user);
  }

  @Get('balance')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'Derived paid-leave balance for a year' })
  balance(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LeaveBalanceQueryDto,
  ): Promise<LeaveBalanceResponseDto> {
    return this.service.balance(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<LeaveRequestResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestResponseDto> {
    return this.service.create(dto, user);
  }

  @Post(':id/review')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a leave request (never your own)' })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveRequestDto,
  ): Promise<LeaveRequestResponseDto> {
    return this.service.review(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
