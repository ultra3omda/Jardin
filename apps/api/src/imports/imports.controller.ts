import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_IMPORT_BYTES } from './file-parse.util';
import type { ImportResult } from './import-types';
import { ImportsService } from './imports.service';
import { buildCsvTemplate, buildXlsxTemplate } from './template.util';

@ApiTags('imports')
@ApiBearerAuth('access-token')
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get('entities')
  @ApiOperation({ summary: 'List importable entities for the current user' })
  listEntities(@CurrentUser() user: AuthenticatedUser): { id: string; label: string }[] {
    return this.imports.listEntities(user);
  }

  @Get(':entity/template')
  @ApiOperation({ summary: 'Download the import template (.xlsx or .csv)' })
  async template(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entity') entityId: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const entity = this.imports.getEntityOrThrow(entityId, user);
    if (format === 'csv') {
      const csv = buildCsvTemplate(entity.columns);
      res
        .setHeader('Content-Type', 'text/csv; charset=utf-8')
        .setHeader('Content-Disposition', `attachment; filename="${entity.id}-template.csv"`)
        .send(csv);
      return;
    }
    const xlsx = await buildXlsxTemplate(entity.label, entity.columns);
    res
      .setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .setHeader('Content-Disposition', `attachment; filename="${entity.id}-template.xlsx"`)
      .send(xlsx);
  }

  @Post(':entity')
  @ApiOperation({ summary: 'Validate (dryRun) or import an uploaded .xlsx/.csv file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_BYTES } }))
  async run(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entity') entityId: string,
    @Query('dryRun') dryRun: string | undefined,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Fichier manquant.' });
    // Default to dry-run unless explicitly "false".
    const isDryRun = dryRun !== 'false';
    return this.imports.run(entityId, file.buffer, file.originalname, isDryRun, user);
  }
}
