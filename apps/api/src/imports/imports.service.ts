import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { parseImportFile } from './file-parse.util';
import type { ImportEntityDef, ImportResult, ImportRowError } from './import-types';
import { getImportEntity, IMPORT_ENTITIES } from './registry';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Entities the current user is allowed to import (for the UI menu). */
  listEntities(user: AuthenticatedUser): { id: string; label: string }[] {
    return IMPORT_ENTITIES.filter((e) => e.roles.includes(user.role)).map((e) => ({
      id: e.id,
      label: e.label,
    }));
  }

  getEntityOrThrow(id: string, user: AuthenticatedUser): ImportEntityDef {
    const entity = getImportEntity(id);
    if (!entity) throw new NotFoundException({ code: 'IMPORT_ENTITY_UNKNOWN' });
    if (!entity.roles.includes(user.role)) {
      throw new ForbiddenException({ code: 'IMPORT_ENTITY_FORBIDDEN' });
    }
    return entity;
  }

  /**
   * Validate (and optionally insert) an uploaded file for an entity.
   * Atomic: any row error ⇒ 0 insert. dryRun=true validates only.
   */
  async run(
    entityId: string,
    buffer: Buffer,
    filename: string,
    dryRun: boolean,
    user: AuthenticatedUser,
  ): Promise<ImportResult> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const entity = this.getEntityOrThrow(entityId, user);

    const records = await parseImportFile(buffer, filename);
    // Map header labels → schema keys (templates use human labels).
    const labelToKey = new Map(entity.columns.map((c) => [c.label.toLowerCase(), c.key]));
    const knownKeys = new Set(entity.columns.map((c) => c.key));

    const errors: ImportRowError[] = [];
    const validRows: Record<string, unknown>[] = [];

    records.forEach((rec, idx) => {
      const remapped: Record<string, string> = {};
      for (const [header, value] of Object.entries(rec)) {
        const key = knownKeys.has(header) ? header : labelToKey.get(header.trim().toLowerCase());
        if (key) remapped[key] = value;
      }
      const parsed = entity.rowSchema.safeParse(remapped);
      if (parsed.success) {
        validRows.push(parsed.data as Record<string, unknown>);
      } else {
        const first = parsed.error.issues[0];
        errors.push({
          row: idx + 1,
          message: `${first.path.join('.') || 'ligne'} : ${first.message}`,
        });
      }
    });

    const base: ImportResult = {
      entity: entity.id,
      total: records.length,
      valid: validRows.length,
      imported: 0,
      dryRun,
      errors,
    };

    if (dryRun || errors.length > 0) {
      return base;
    }

    // Insert atomically. A thrown row (e.g. missing parent/class) rolls back all.
    try {
      const imported = await this.prisma.$transaction(async (tx) => {
        return entity.insert(validRows, { tenantId: user.tenantId!, user, tx });
      });
      await this.writeAudit(entity.id, user, imported);
      return { ...base, imported };
    } catch (e) {
      throw new BadRequestException({
        code: 'IMPORT_FAILED',
        message: e instanceof Error ? e.message : 'Import impossible.',
      });
    }
  }

  private async writeAudit(entity: string, user: AuthenticatedUser, imported: number): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: createId(),
          action: 'import.completed',
          resource: `import:${entity}`,
          tenantId: user.tenantId,
          userId: user.id,
          metadata: { entity, imported },
        },
      });
    } catch (err) {
      this.logger.error(`audit import.completed failed: ${String(err)}`);
    }
  }
}
