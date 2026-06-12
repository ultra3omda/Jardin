import { BadRequestException, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { StudentStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { PromoteDto } from './dto/promotion.dto';

const GRADUATED = 'GRADUATED';

type PlanRow = {
  fromClassId: string;
  fromClassName: string;
  studentCount: number;
  action: 'PROMOTE' | 'GRADUATE' | 'SKIP';
  toClassId: string | null;
};

/**
 * G7 — Passage de classe : promotion en masse d'élèves d'une année vers la
 * suivante (mapping classe→classe), avec règle de sortie (→ ALUMNI).
 * `preview` calcule le plan sans écrire ; `commit` exécute en transaction.
 */
@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Calcule le plan sans rien écrire. */
  async preview(tenantId: string, dto: PromoteDto): Promise<{ plan: PlanRow[]; total: number }> {
    const fromClasses = await this.prisma.class.findMany({
      where: { tenantId, schoolYear: dto.fromYear, deletedAt: null },
      include: {
        _count: {
          select: { students: { where: { status: StudentStatus.ACTIVE, deletedAt: null } } },
        },
      },
    });
    const plan: PlanRow[] = fromClasses.map((c) => {
      const target = dto.mapping[c.id];
      const action: PlanRow['action'] =
        target === GRADUATED ? 'GRADUATE' : target ? 'PROMOTE' : 'SKIP';
      return {
        fromClassId: c.id,
        fromClassName: c.name,
        studentCount: c._count.students,
        action,
        toClassId: action === 'PROMOTE' ? target : null,
      };
    });
    const total = plan
      .filter((p) => p.action !== 'SKIP')
      .reduce((acc, p) => acc + p.studentCount, 0);
    return { plan, total };
  }

  /** Exécute la promotion en transaction et journalise. */
  async commit(tenantId: string, userId: string, dto: PromoteDto) {
    return this.prisma.$transaction(async (tx) => {
      let moved = 0;
      for (const [fromClassId, target] of Object.entries(dto.mapping)) {
        const students = await tx.student.findMany({
          where: { tenantId, classId: fromClassId, status: StudentStatus.ACTIVE, deletedAt: null },
          select: { id: true },
        });
        const ids = students.map((s) => s.id);
        if (ids.length === 0) continue;

        if (target === GRADUATED) {
          await tx.student.updateMany({
            where: { id: { in: ids } },
            data: { status: StudentStatus.ALUMNI, classId: null },
          });
          moved += ids.length;
          continue;
        }

        const toClass = await tx.class.findFirst({
          where: { id: target, tenantId, schoolYear: dto.toYear, deletedAt: null },
        });
        if (!toClass) {
          throw new BadRequestException({
            code: 'TARGET_CLASS_NOT_FOUND',
            message: `Target class ${target} not found for year ${dto.toYear}`,
          });
        }
        await tx.student.updateMany({
          where: { id: { in: ids } },
          data: { classId: toClass.id, classroom: toClass.name },
        });
        moved += ids.length;
      }

      const log = await tx.classPromotionLog.create({
        data: {
          id: createId(),
          tenantId,
          fromYear: dto.fromYear,
          toYear: dto.toYear,
          mapping: dto.mapping as object,
          studentCount: moved,
          executedById: userId,
        },
      });
      return { promoted: moved, logId: log.id };
    });
  }
}
