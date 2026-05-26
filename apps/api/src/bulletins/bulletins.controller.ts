import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BulletinsService } from './bulletins.service';
import {
  BulletinResponseDto,
  GenerateBulletinDto,
} from './dto/bulletin.dto';

/** V6 — Bulletins (PDF generation). */
@ApiTags('bulletins')
@ApiBearerAuth()
@Controller('bulletins')
export class BulletinsController {
  constructor(private readonly service: BulletinsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Generate / re-generate bulletin PDF for a (student, period). Returns the PDF.' })
  @ApiResponse({ status: 200, description: 'application/pdf' })
  async generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateBulletinDto,
    @Res() res: Response,
  ): Promise<void> {
    const { pdf, bulletin } = await this.service.generate(dto, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="bulletin_${bulletin.studentId}_${bulletin.gradePeriodId}.pdf"`,
    );
    res.setHeader('X-Bulletin-Id', bulletin.id);
    res.send(pdf);
  }

  @Get(':studentId/:gradePeriodId/latest')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get latest bulletin metadata for (student, period) — null if not generated yet' })
  @ApiResponse({ status: 200, type: BulletinResponseDto })
  latest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Param('gradePeriodId') gradePeriodId: string,
  ): Promise<BulletinResponseDto | null> {
    return this.service.getLatest(studentId, gradePeriodId, user);
  }
}
