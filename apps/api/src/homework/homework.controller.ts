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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateHomeworkDto,
  HomeworkAttachmentUploadDto,
  HomeworkAttachmentUploadResponseDto,
  HomeworkResponseDto,
  HomeworkWithSubmissionsDto,
  ListChildHomeworkResponseDto,
  ListHomeworkResponseDto,
  UpdateHomeworkDto,
  UpsertSubmissionDto,
} from './dto/homework.dto';
import { HomeworkService } from './homework.service';

/** Devoirs (TAF). */
@ApiTags('homework')
@ApiBearerAuth()
@Controller('homework')
export class HomeworkController {
  constructor(private readonly service: HomeworkService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a homework for a class (TEACHER on own class / ADMIN)' })
  @ApiResponse({ status: 201, type: HomeworkResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHomeworkDto,
  ): Promise<HomeworkResponseDto> {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'List homework (optional ?classId=)' })
  @ApiResponse({ status: 200, type: ListHomeworkResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classId') classId?: string,
  ): Promise<ListHomeworkResponseDto> {
    return this.service.list(classId, user);
  }

  @Get('my-children')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: "Homework for the parent's children (with each child's status)" })
  @ApiResponse({ status: 200, type: ListChildHomeworkResponseDto })
  myChildren(@CurrentUser() user: AuthenticatedUser): Promise<ListChildHomeworkResponseDto> {
    return this.service.myChildren(user);
  }

  @Post('attachment-upload-url')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get a signed R2 PUT URL for a homework attachment' })
  @ApiResponse({ status: 200, type: HomeworkAttachmentUploadResponseDto })
  attachmentUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: HomeworkAttachmentUploadDto,
  ): Promise<HomeworkAttachmentUploadResponseDto> {
    return this.service.getAttachmentUploadUrl(dto.contentType, user);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Homework detail with the class roster + submissions' })
  @ApiResponse({ status: 200, type: HomeworkWithSubmissionsDto })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<HomeworkWithSubmissionsDto> {
    return this.service.findById(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update a homework' })
  @ApiResponse({ status: 200, type: HomeworkResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
  ): Promise<HomeworkResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a homework' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }

  @Put(':id/submissions')
  @Roles(UserRole.TEACHER, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: "Track a student's submission status (TEACHER / ADMIN)" })
  @ApiResponse({ status: 200, type: HomeworkWithSubmissionsDto })
  upsertSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertSubmissionDto,
  ): Promise<HomeworkWithSubmissionsDto> {
    return this.service.upsertSubmission(id, dto, user);
  }
}
