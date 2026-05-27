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
  AdminClassPerfDto,
  ChildGradesDto,
  ClassEvalStatsDto,
  CreateEvaluationDto,
  EvaluationResponseDto,
  EvaluationWithGradesResponseDto,
  GradeResponseDto,
  ListEvaluationsResponseDto,
  UpdateEvaluationDto,
  UpsertGradeDto,
} from './dto/evaluation.dto';
import { EvaluationsService } from './evaluations.service';

/** V6 — Evaluations + Grades (TEACHER & SCHOOL_ADMIN). */
@ApiTags('evaluations')
@ApiBearerAuth()
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly service: EvaluationsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List evaluations (filters: classId, gradePeriodId, subjectId)' })
  @ApiResponse({ status: 200, type: ListEvaluationsResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classId') classId?: string,
    @Query('gradePeriodId') gradePeriodId?: string,
    @Query('subjectId') subjectId?: string,
  ): Promise<ListEvaluationsResponseDto> {
    return this.service.listEvaluations(user, { classId, gradePeriodId, subjectId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create an evaluation (SCHOOL_ADMIN, TEACHER on assigned class)' })
  @ApiResponse({ status: 201, type: EvaluationResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    return this.service.createEvaluation(dto, user);
  }

  // ─── Mobile aggregation routes (must be declared before /:id) ───────────

  @Get('my-grades')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'PARENT — grades for all linked children (current period)' })
  @ApiResponse({ status: 200, type: [ChildGradesDto] })
  myGrades(@CurrentUser() user: AuthenticatedUser): Promise<ChildGradesDto[]> {
    return this.service.getMyGrades(user.tenantId!, user.id);
  }

  @Get('my-classes')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'TEACHER — evaluation progress per assigned class/subject' })
  @ApiResponse({ status: 200, type: [ClassEvalStatsDto] })
  myClasses(@CurrentUser() user: AuthenticatedUser): Promise<ClassEvalStatsDto[]> {
    return this.service.getMyClassesStats(user.tenantId!, user.id);
  }

  @Get('admin-perf')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'SCHOOL_ADMIN — class performance overview for current period' })
  @ApiResponse({ status: 200, type: [AdminClassPerfDto] })
  adminPerf(@CurrentUser() user: AuthenticatedUser): Promise<AdminClassPerfDto[]> {
    return this.service.getAdminPerf(user.tenantId!);
  }

  // ─── Standard CRUD routes ─────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get evaluation with all grades' })
  @ApiResponse({ status: 200, type: EvaluationWithGradesResponseDto })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EvaluationWithGradesResponseDto> {
    return this.service.getEvaluationWithGrades(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update an evaluation (SCHOOL_ADMIN, TEACHER on assigned class)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEvaluationDto,
  ): Promise<EvaluationResponseDto> {
    return this.service.updateEvaluation(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete an evaluation (SCHOOL_ADMIN, TEACHER on assigned class)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.deleteEvaluation(id, user);
  }

  @Put(':id/grades')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Upsert a grade for one student on this evaluation' })
  @ApiResponse({ status: 200, type: GradeResponseDto })
  upsertGrade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') evaluationId: string,
    @Body() dto: UpsertGradeDto,
  ): Promise<GradeResponseDto> {
    return this.service.upsertGrade(evaluationId, dto, user);
  }

  @Delete(':id/grades/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a grade' })
  deleteGrade(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') evaluationId: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    return this.service.deleteGrade(evaluationId, studentId, user);
  }
}
