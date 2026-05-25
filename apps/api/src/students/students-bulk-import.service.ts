import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { parse } from 'csv-parse/sync';
import { Prisma, Sex } from '@prisma/client';
import { z } from 'zod';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * V2 — Bulk import CSV pour le module Élèves.
 * Décision : 1 erreur sur n'importe quelle ligne = 0 insert (atomique).
 * dryRun=true (défaut) → validation seule, aucun insert.
 * Limites : 1000 lignes / 5 MB par upload.
 */
const MAX_ROWS = 1000;
const MAX_BYTES = 5 * 1024 * 1024;
const ISO_ALPHA2 = /^[A-Z]{2}$/;
const ISO_LANG2 = /^[a-z]{2}$/;

const rowSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD requis'),
  sex: z.enum([Sex.M, Sex.F]),
  classroom: z.string().min(1).max(50),
  parentEmail: z.string().email(),
  nationality: z.string().regex(ISO_ALPHA2).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().regex(ISO_ALPHA2).optional().or(z.literal('')),
  motherTongue: z.string().regex(ISO_LANG2).optional().or(z.literal('')),
  siblingsCount: z.coerce.number().int().min(0).optional(),
});

export type CsvRowError = { row: number; message: string };

export interface BulkImportResult {
  imported: number;
  valid: number;
  errors: CsvRowError[];
  dryRun: boolean;
}

@Injectable()
export class StudentsBulkImportService {
  private readonly logger = new Logger(StudentsBulkImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importCsv(
    csvBuffer: Buffer,
    dryRun: boolean,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<BulkImportResult> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    if (csvBuffer.byteLength > MAX_BYTES) {
      throw new PayloadTooLargeException({
        code: 'CSV_TOO_LARGE',
        message: `Fichier > ${MAX_BYTES / 1024 / 1024}MB`,
      });
    }
    const tenantId = currentUser.tenantId;

    let records: Record<string, string>[];
    try {
      records = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch (err) {
      return {
        imported: 0,
        valid: 0,
        errors: [{ row: 0, message: `CSV malformé : ${(err as Error).message}` }],
        dryRun,
      };
    }

    if (records.length > MAX_ROWS) {
      throw new BadRequestException({
        code: 'CSV_TOO_MANY_ROWS',
        message: `Max ${MAX_ROWS} lignes par upload`,
      });
    }

    const errors: CsvRowError[] = [];
    const validRows: Prisma.StudentCreateManyInput[] = [];
    records.forEach((row, idx) => {
      const parsed = rowSchema.safeParse(row);
      if (!parsed.success) {
        errors.push({
          row: idx + 2, // header is line 1, first data row is line 2
          message: parsed.error.issues
            .map((i) => `${i.path.join('.') || 'row'}: ${i.message}`)
            .join('; '),
        });
        return;
      }
      const r = parsed.data;
      validRows.push({
        id: createId(),
        tenantId,
        firstName: r.firstName,
        lastName: r.lastName,
        dateOfBirth: new Date(r.dateOfBirth),
        sex: r.sex,
        classroom: r.classroom,
        parentEmail: r.parentEmail.toLowerCase(),
        nationality: r.nationality ? r.nationality : null,
        city: r.city ? r.city : null,
        country: r.country ? r.country : 'TN',
        motherTongue: r.motherTongue ? r.motherTongue : null,
        siblingsCount: r.siblingsCount ?? 0,
      });
    });

    if (dryRun) {
      return { imported: 0, valid: validRows.length, errors, dryRun: true };
    }
    if (errors.length > 0) {
      // Atomicité : 1 erreur = 0 insert.
      return { imported: 0, valid: validRows.length, errors, dryRun: false };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.createMany({ data: validRows });
      await tx.auditLog.create({
        data: {
          id: createId(),
          action: 'student.bulk_imported',
          resource: 'student',
          tenantId,
          userId: currentUser.id,
          metadata: { rowCount: validRows.length },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });
    this.logger.log(`bulk import: ${validRows.length} rows for tenant ${tenantId}`);

    return { imported: validRows.length, valid: validRows.length, errors: [], dryRun: false };
  }
}
