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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSubjectDto,
  ListSubjectsResponseDto,
  SubjectResponseDto,
  UpdateSubjectDto,
} from './dto/subject.dto';
import { SubjectsService } from './subjects.service';

/** V6 — Subjects (matières). */
@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List subjects of the tenant' })
  @ApiResponse({ status: 200, type: ListSubjectsResponseDto })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListSubjectsResponseDto> {
    return this.service.list(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a subject (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: SubjectResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a subject (SCHOOL_ADMIN)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ): Promise<SubjectResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a subject (SCHOOL_ADMIN)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
