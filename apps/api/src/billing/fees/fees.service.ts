import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { FeeAssignmentStatus, SmsStatus } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { SmsLogService } from '../../common/sms/sms-log.service';
import { SmsService } from '../../common/sms/sms.service';
import { NotificationFanoutService } from '../../notifications/notification-fanout.service';
import { BulkAssignDto, CreateFeeTypeDto, UpdateFeeTypeDto } from './dto/fees.dto';
import { splitInstallments } from './fee-installment.util';

/**
 * G2 — Référentiel de frais & affectation.
 * Catalogue de frais réutilisable, affectation en masse avec échéancier/avances,
 * génération d'Invoice, tableau de bord impayés, relance notif + SMS.
 */
@Injectable()
export class FeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly sms: SmsService,
    private readonly smsLog: SmsLogService,
  ) {}

  // ─── Fee types (catalogue) ───────────────────────────────────────────────

  listFeeTypes(tenantId: string) {
    return this.prisma.feeType.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  createFeeType(tenantId: string, dto: CreateFeeTypeDto) {
    return this.prisma.feeType.create({
      data: {
        id: createId(),
        tenantId,
        name: dto.name,
        category: dto.category,
        defaultAmount: dto.defaultAmount,
        recurrence: dto.recurrence,
        level: dto.level ?? null,
        schoolYear: dto.schoolYear,
      },
    });
  }

  async updateFeeType(tenantId: string, id: string, dto: UpdateFeeTypeDto) {
    const existing = await this.prisma.feeType.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Fee type not found');
    return this.prisma.feeType.update({ where: { id }, data: { ...dto } });
  }

  async deleteFeeType(tenantId: string, id: string) {
    const existing = await this.prisma.feeType.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Fee type not found');
    await this.prisma.feeType.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ─── Bulk assignment (affecte-frais) ─────────────────────────────────────

  /** Affecte un frais en masse à une classe ou un niveau. Skippe les élèves déjà affectés. */
  async bulkAssign(tenantId: string, dto: BulkAssignDto) {
    const feeType = await this.prisma.feeType.findFirst({
      where: { id: dto.feeTypeId, tenantId, deletedAt: null },
    });
    if (!feeType) throw new NotFoundException('Fee type not found');
    if (!dto.classId && !dto.level) {
      throw new BadRequestException('classId or level required');
    }

    const students = await this.prisma.student.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(dto.classId ? { classId: dto.classId } : {}),
      },
      select: { id: true },
    });

    const amount = dto.amount ?? Number(feeType.defaultAmount);
    const advance = dto.advanceAmount ?? 0;
    let created = 0;
    let skipped = 0;

    for (const s of students) {
      const exists = await this.prisma.feeAssignment.findFirst({
        where: { studentId: s.id, feeTypeId: dto.feeTypeId, schoolYear: dto.schoolYear },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const assignmentId = createId();
      const parts = splitInstallments(amount, dto.installments, advance);
      const baseDate = new Date();

      await this.prisma.feeAssignment.create({
        data: {
          id: assignmentId,
          tenantId,
          studentId: s.id,
          feeTypeId: dto.feeTypeId,
          schoolYear: dto.schoolYear,
          totalAmount: amount,
          advanceAmount: advance,
          status: FeeAssignmentStatus.DUE,
          installments: {
            create: parts.map((p, i) => ({
              id: createId(),
              tenantId,
              label: `Tranche ${i + 1}`,
              dueDate: new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 5),
              amount: p,
            })),
          },
        },
      });
      created++;
    }
    return { created, skipped, total: students.length };
  }

  // ─── Invoice generation ──────────────────────────────────────────────────

  /** Génère une Invoice pour une échéance non encore facturée. */
  async generateInvoiceForInstallment(tenantId: string, installmentId: string) {
    const inst = await this.prisma.feeInstallment.findFirst({
      where: { id: installmentId, tenantId },
      include: { assignment: { include: { feeType: true } } },
    });
    if (!inst) throw new NotFoundException('Installment not found');
    if (inst.invoiceId) throw new BadRequestException('Already invoiced');

    const invoiceId = createId();
    await this.prisma.invoice.create({
      data: {
        id: invoiceId,
        tenantId,
        studentId: inst.assignment.studentId,
        feeTypeId: inst.assignment.feeTypeId,
        title: `${inst.assignment.feeType.name} — ${inst.label}`,
        amount: inst.amount,
        currency: 'TND',
        dueDate: inst.dueDate,
        status: 'PENDING',
      },
    });
    await this.prisma.feeInstallment.update({
      where: { id: installmentId },
      data: { invoiceId },
    });
    return { invoiceId };
  }

  // ─── Unpaid dashboard (recherche-nonpaye) ────────────────────────────────

  /** Échéances en retard ou à venir non payées, filtrables. */
  async listUnpaid(tenantId: string, filters: { classId?: string; studentId?: string }) {
    const installments = await this.prisma.feeInstallment.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'OVERDUE'] },
        assignment: {
          status: { in: ['DUE', 'PARTIAL'] },
          ...(filters.studentId ? { studentId: filters.studentId } : {}),
          ...(filters.classId ? { student: { classId: filters.classId } } : {}),
        },
      },
      include: {
        assignment: {
          include: {
            feeType: true,
            student: {
              select: { id: true, firstName: true, lastName: true, classId: true },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
    const now = new Date();
    return installments.map((i) => ({
      installmentId: i.id,
      studentId: i.assignment.student.id,
      studentName: `${i.assignment.student.firstName} ${i.assignment.student.lastName}`,
      feeName: i.assignment.feeType.name,
      label: i.label,
      dueDate: i.dueDate,
      amount: Number(i.amount),
      overdue: i.dueDate < now,
    }));
  }

  // ─── Reminders (relance impayés : notif + SMS) ───────────────────────────

  /** Envoie un rappel notif + SMS aux parents des échéances ciblées. */
  async remindUnpaid(tenantId: string, installmentIds: string[]) {
    let sent = 0;
    for (const id of installmentIds) {
      const inst = await this.prisma.feeInstallment.findFirst({
        where: { id, tenantId },
        include: {
          assignment: {
            include: {
              feeType: true,
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  parentRelations: {
                    where: { isPrimaryContact: true },
                    include: { parent: { select: { id: true, phone: true } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!inst) continue;
      const rel = inst.assignment.student.parentRelations[0];
      if (!rel) continue;

      const studentName = `${inst.assignment.student.firstName} ${inst.assignment.student.lastName}`;
      const amount = Number(inst.amount).toFixed(3);
      const body = `Rappel: ${inst.assignment.feeType.name} (${inst.label}) de ${amount} TND pour ${studentName} est dû.`;

      await this.fanout.fanoutPaymentReminder(tenantId, rel.parent.id, body, id);

      const result = await this.sms.send(rel.parent.phone, body);
      const status: SmsStatus = result.success
        ? SmsStatus.SENT
        : result.skipped
          ? SmsStatus.SKIPPED
          : SmsStatus.FAILED;
      await this.smsLog.record({
        tenantId,
        to: rel.parent.phone,
        body,
        status,
        context: 'payment_reminder',
        relatedId: id,
      });
      sent++;
    }
    return { sent };
  }
}
