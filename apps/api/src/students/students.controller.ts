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
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  ListStudentsResponseDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './dto/student.dto';
import { StudentsService } from './students.service';

/**
 * V2 — Module Élèves : Controller REST.
 * RBAC :
 *  - GET    /students            → SCHOOL_ADMIN, TEACHER, PARENT (filtré), STAFF
 *  - GET    /students/:id        → idem
 *  - POST   /students            → SCHOOL_ADMIN
 *  - PATCH  /students/:id        → SCHOOL_ADMIN
 *  - DELETE /students/:id        → SCHOOL_ADMIN (soft-delete)
 */
@ApiTags('students')
@ApiBearerAuth('access-token')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a student (SCHOOL_ADMIN only)' })
  @ApiResponse({ status: 201, type: StudentResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentDto,
    @Req() req: Request,
  ): Promise<StudentResponseDto> {
    return this.students.create(dto, user, getRequestMeta(req));
  }

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STAFF)
  @ApiOperation({
    summary: 'List students (scoped by tenant; PARENT filtered by parentEmail)',
  })
  @ApiResponse({ status: 200, type: ListStudentsResponseDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStudentsQueryDto,
  ): Promise<ListStudentsResponseDto> {
    return this.students.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STAFF)
  @ApiOperation({ summary: 'Get student by id (PARENT must own the row)' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<StudentResponseDto> {
    return this.students.getById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a student (SCHOOL_ADMIN only)' })
  @ApiResponse({ status: 200, type: StudentResponseDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @Req() req: Request,
  ): Promise<StudentResponseDto> {
    return this.students.update(id, dto, user, getRequestMeta(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a student (SCHOOL_ADMIN only)' })
  @ApiResponse({ status: 204 })
  async softDelete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.students.softDelete(id, user, getRequestMeta(req));
  }
}
