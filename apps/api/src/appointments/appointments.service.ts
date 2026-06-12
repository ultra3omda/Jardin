import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { AppointmentStatus, SmsStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { SmsLogService } from '../common/sms/sms-log.service';
import { SmsService } from '../common/sms/sms.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { BookDto, CreateSlotDto, CreateTypeDto } from './dto/appointments.dto';

/**
 * G6 — Rendez-vous parents. Créneaux par staff/enseignant, prise de RDV par les
 * parents (anti-double-booking via slotId @unique + transaction), confirmation
 * notif + SMS.
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly sms: SmsService,
    private readonly smsLog: SmsLogService,
  ) {}

  // ─── Types ────────────────────────────────────────────────────────────────

  listTypes(tenantId: string) {
    return this.prisma.appointmentType.findMany({
      where: { tenantId, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    });
  }

  createType(tenantId: string, dto: CreateTypeDto) {
    return this.prisma.appointmentType.create({
      data: { id: createId(), tenantId, name: dto.name, durationMin: dto.durationMin },
    });
  }

  // ─── Slots ────────────────────────────────────────────────────────────────

  createSlot(tenantId: string, dto: CreateSlotDto) {
    return this.prisma.appointmentSlot.create({
      data: {
        id: createId(),
        tenantId,
        staffUserId: dto.staffUserId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  availableSlots(tenantId: string) {
    return this.prisma.appointmentSlot.findMany({
      where: { tenantId, isBooked: false, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
    });
  }

  // ─── Booking (anti double-booking) ─────────────────────────────────────────

  /** Réservation transactionnelle. slotId @unique bloque le double-booking. */
  async book(tenantId: string, parentUserId: string, dto: BookDto) {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.appointmentSlot.findFirst({
        where: { id: dto.slotId, tenantId, isBooked: false },
      });
      if (!slot) throw new ConflictException({ code: 'SLOT_NOT_AVAILABLE' });
      if (slot.startsAt < new Date()) throw new ConflictException({ code: 'SLOT_IN_PAST' });
      await tx.appointmentSlot.update({ where: { id: slot.id }, data: { isBooked: true } });
      return tx.appointment.create({
        data: {
          id: createId(),
          tenantId,
          slotId: dto.slotId,
          typeId: dto.typeId,
          parentUserId,
          studentId: dto.studentId ?? null,
          status: AppointmentStatus.REQUESTED,
          note: dto.note ?? null,
        },
      });
    });
  }

  async setStatus(tenantId: string, id: string, status: AppointmentStatus) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { slot: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (status === AppointmentStatus.CANCELLED) {
      await this.prisma.appointmentSlot.update({
        where: { id: appt.slotId },
        data: { isBooked: false },
      });
    }
    const updated = await this.prisma.appointment.update({ where: { id }, data: { status } });
    if (status === AppointmentStatus.CONFIRMED) {
      await this.notifyConfirm(tenantId, appt.parentUserId, appt.slot.startsAt, id);
    }
    return updated;
  }

  private async notifyConfirm(
    tenantId: string,
    parentUserId: string,
    startsAt: Date,
    apptId: string,
  ) {
    const parent = await this.prisma.user.findFirst({
      where: { id: parentUserId },
      select: { phone: true },
    });
    const when = startsAt.toLocaleString('fr-FR');
    const body = `Votre rendez-vous est confirmé pour le ${when}.`;
    await this.fanout.fanoutAppointment(tenantId, parentUserId, body, apptId);
    const res = await this.sms.send(parent?.phone, body);
    const smsStatus: SmsStatus = res.success
      ? SmsStatus.SENT
      : res.skipped
        ? SmsStatus.SKIPPED
        : SmsStatus.FAILED;
    await this.smsLog.record({
      tenantId,
      to: parent?.phone,
      body,
      status: smsStatus,
      context: 'appointment_confirm',
      relatedId: apptId,
    });
  }

  listForStaff(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId },
      include: { slot: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listForParent(tenantId: string, parentUserId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId, parentUserId },
      include: { slot: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
