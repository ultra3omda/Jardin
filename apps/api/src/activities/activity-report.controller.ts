import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityReportService } from './activity-report.service';
import { ReportPhotoUrlDto, UpsertReportDto } from './dto/activity-report.dto';

/** G5 — Rapports d'activité PDF (cahier d'activités parents). */
@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivityReportController {
  constructor(private readonly service: ActivityReportService) {}

  @Post(':id/report')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: "Crée/met à jour le rapport d'une activité" })
  upsert(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertReportDto,
  ) {
    return this.service.upsert(u.tenantId!, u.id, id, dto);
  }

  @Get(':id/report')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(u.tenantId!, id);
  }

  @Get(':id/report/pdf')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiResponse({ status: 200, description: 'application/pdf' })
  async pdf(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.service.getPdf(u.tenantId!, id, u);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="rapport_${id}.pdf"`);
    res.send(buffer);
  }

  @Post(':id/report/photo-upload-url')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  photoUrl(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportPhotoUrlDto,
  ) {
    return this.service.photoUploadUrl(u.tenantId!, id, dto.contentType);
  }
}
