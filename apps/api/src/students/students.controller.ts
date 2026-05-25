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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
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
import { BulkImportResponseDto } from './dto/bulk-import.dto';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  ListStudentsResponseDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './dto/student.dto';
import { StudentsBulkImportService } from './students-bulk-import.service';
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
  constructor(
    private readonly students: StudentsService,
    private readonly bulkImport: StudentsBulkImportService,
  ) {}

  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Bulk import students from CSV (SCHOOL_ADMIN only). dryRun=true by default — explicit ?dryRun=false to commit.',
  })
  @ApiResponse({ status: 200, type: BulkImportResponseDto })
  async bulkImportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun: string | undefined,
    @Req() req: Request,
  ): Promise<BulkImportResponseDto> {
    const isDryRun = dryRun !== 'false';
    return this.bulkImport.importCsv(file.buffer, isDryRun, user, getRequestMeta(req));
  }

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
