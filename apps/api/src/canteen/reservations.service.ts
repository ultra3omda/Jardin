import { ForbiddenException, Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { ReservationStatus } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * G4 — Réservation de repas (reservationcantine). Idempotente par [élève, jour].
 * Un PARENT ne réserve/voit que pour ses enfants.
 */
@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Réservation idempotente (upsert sur [studentId, date]).
   *  Un PARENT ne peut réserver que pour ses propres enfants. */
  async reserve(user: AuthenticatedUser, studentId: string, dateIso: string) {
    const tenantId = user.tenantId!;
    if (user.role === 'PARENT') {
      const owns = await this.prisma.parentStudent.findFirst({
        where: { tenantId, parentUserId: user.id, studentId },
        select: { id: true },
      });
      if (!owns) throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED' });
    }
    const date = new Date(dateIso);
    return this.prisma.canteenReservation.upsert({
      where: { unique_reservation_per_day: { studentId, date } },
      create: {
        id: createId(),
        tenantId,
        studentId,
        date,
        status: ReservationStatus.RESERVED,
        createdById: user.id,
      },
      update: { status: ReservationStatus.RESERVED },
    });
  }

  /** Réserve toute une classe pour un jour (idempotent). */
  async reserveClass(tenantId: string, userId: string, classId: string, dateIso: string) {
    const date = new Date(dateIso);
    const students = await this.prisma.student.findMany({
      where: { tenantId, classId, deletedAt: null },
      select: { id: true },
    });
    for (const s of students) {
      await this.prisma.canteenReservation.upsert({
        where: { unique_reservation_per_day: { studentId: s.id, date } },
        create: {
          id: createId(),
          tenantId,
          studentId: s.id,
          date,
          status: ReservationStatus.RESERVED,
          createdById: userId,
        },
        update: {},
      });
    }
    return { created: students.length, total: students.length };
  }

  async setStatus(tenantId: string, id: string, status: ReservationStatus) {
    const existing = await this.prisma.canteenReservation.findFirst({ where: { id, tenantId } });
    if (!existing) return null;
    return this.prisma.canteenReservation.update({ where: { id }, data: { status } });
  }

  async list(
    user: AuthenticatedUser,
    filters: { date?: string; classId?: string; studentId?: string },
  ) {
    const isParent = user.role === 'PARENT';
    const childIds = isParent
      ? (
          await this.prisma.parentStudent.findMany({
            where: { parentUserId: user.id },
            select: { studentId: true },
          })
        ).map((r) => r.studentId)
      : null;
    return this.prisma.canteenReservation.findMany({
      where: {
        tenantId: user.tenantId!,
        ...(filters.date ? { date: new Date(filters.date) } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.classId ? { student: { classId: filters.classId } } : {}),
        ...(isParent ? { studentId: { in: childIds! } } : {}),
      },
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  /** Stats : nb repas/jour (RESERVED+SERVED) + répartition des régimes. */
  async stats(tenantId: string, from: string, to: string) {
    const reservations = await this.prisma.canteenReservation.groupBy({
      by: ['date'],
      where: {
        tenantId,
        date: { gte: new Date(from), lte: new Date(to) },
        status: { in: [ReservationStatus.RESERVED, ReservationStatus.SERVED] },
      },
      _count: true,
    });
    const regimes = await this.prisma.mealPlan.groupBy({
      by: ['regime'],
      where: { tenantId, active: true, deletedAt: null },
      _count: true,
    });
    return {
      perDay: reservations.map((r) => ({ date: r.date, count: r._count })),
      regimes: regimes.map((r) => ({ regime: r.regime, count: r._count })),
    };
  }
}
