import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  BulkObservationDto,
  CreateObservationDto,
  MediaUploadUrlDto,
  UpdateObservationDto,
} from './dto/observations.dto';
import { ObservationsService } from './observations.service';

/** G3 — Observations structurées. */
@ApiTags('observations')
@ApiBearerAuth()
@Controller('observations')
export class ObservationsController {
  constructor(private readonly service: ObservationsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'Liste les observations (parent: ses enfants visibles)' })
  list(
    @CurrentUser() u: AuthenticatedUser,
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('category') category?: string,
  ) {
    return this.service.list(u, { studentId, classId, category });
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateObservationDto) {
    return this.service.create(u.tenantId!, u.id, dto);
  }

  @Post('bulk')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Même observation pour plusieurs élèves (batchId partagé)' })
  bulk(@CurrentUser() u: AuthenticatedUser, @Body() dto: BulkObservationDto) {
    return this.service.bulkCreate(u.tenantId!, u.id, dto);
  }

  @Post('media-upload-url')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  uploadUrl(@CurrentUser() u: AuthenticatedUser, @Body() dto: MediaUploadUrlDto) {
    return this.service.mediaUploadUrl(u.tenantId!, dto.contentType);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  update(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateObservationDto,
  ) {
    return this.service.update(u.tenantId!, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(u.tenantId!, id);
  }
}
