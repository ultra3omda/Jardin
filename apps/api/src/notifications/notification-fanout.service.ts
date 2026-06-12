import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createElement } from 'react';

import { ResendService } from '../common/email/resend.service';
import { ExpoPushService } from '../common/push/expo-push.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationEmail } from '../common/email/templates/notification-email';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './dto/notification.dto';

/** Internal shape passed to the private {@link NotificationFanoutService.deliver}. */
interface DeliverInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  emailSubject: string;
  ctaLabel: string;
  /** Relative path appended to the web app base URL for the email CTA. */
  ctaPath: string;
  /** Extra payload forwarded to the in-app record and the push deep link. */
  data?: Record<string, unknown>;
}

/**
 * V10 — Multi-channel notification fan-out.
 *
 * Single entry point that other domain services call after a business event.
 * For each recipient it delivers across up to three channels:
 *   1. in-app (always)        → {@link NotificationsService.create}
 *   2. email (opt-in)         → {@link ResendService.send}
 *   3. mobile push (opt-in)   → {@link ExpoPushService.send}
 *
 * Non-blocking by contract: every channel is wrapped so a delivery failure
 * (or a recipient with notifications disabled) never propagates back into the
 * business flow that triggered it. The caller may safely `void` the promise.
 */
@Injectable()
export class NotificationFanoutService {
  private readonly logger = new Logger(NotificationFanoutService.name);
  private readonly webAppUrl: string;

  constructor(
    private readonly notifications: NotificationsService,
    private readonly resend: ResendService,
    private readonly push: ExpoPushService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.webAppUrl = this.config.get<string>(
      'webAppUrl',
      'https://klasso.tn',
    );
  }

  // ─── Public fan-out methods (one per business event) ───────────────────────

  /** New direct message received. */
  async fanoutMessage(
    tenantId: string,
    recipientUserId: string,
    senderName: string,
    conversationId: string,
  ): Promise<void> {
    return this.deliver({
      tenantId,
      userId: recipientUserId,
      type: NotificationType.MESSAGE,
      title: `Nouveau message de ${senderName}`,
      body: `${senderName} vous a envoyé un nouveau message.`,
      emailSubject: `Nouveau message de ${senderName}`,
      ctaLabel: 'Voir le message',
      ctaPath: '/messages',
      data: { conversationId },
    });
  }

  /** A grade was published for a student. */
  async fanoutGrade(
    tenantId: string,
    parentUserId: string,
    studentName: string,
    subjectName: string,
    periodName?: string,
  ): Promise<void> {
    const periodSuffix = periodName ? ` (${periodName})` : '';
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.GRADE,
      title: `Nouvelle note : ${subjectName}`,
      body: `Une nouvelle note en ${subjectName} a été publiée pour ${studentName}${periodSuffix}.`,
      emailSubject: `Nouvelle note : ${subjectName}`,
      ctaLabel: 'Voir les notes',
      ctaPath: '/pedagogy',
      data: { studentName, subjectName, periodName },
    });
  }

  /** An absence was recorded for a student. */
  async fanoutAbsence(
    tenantId: string,
    parentUserId: string,
    studentName: string,
    date: Date | string,
    justified: boolean,
  ): Promise<void> {
    const formattedDate = this.formatDate(date);
    const status = justified ? 'justifiée' : 'non justifiée';
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.ATTENDANCE,
      title: `Absence signalée pour ${studentName}`,
      body: `Une absence ${status} a été enregistrée pour ${studentName} le ${formattedDate}.`,
      emailSubject: `Absence signalée pour ${studentName}`,
      ctaLabel: 'Voir les présences',
      ctaPath: '/attendance',
      data: { studentName, justified },
    });
  }

  /** A new invoice was issued. */
  async fanoutInvoice(
    tenantId: string,
    parentUserId: string,
    studentName: string,
    amount: number,
  ): Promise<void> {
    const formattedAmount = this.formatAmount(amount);
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.INVOICE,
      title: 'Nouvelle facture',
      body: `Une nouvelle facture d'un montant de ${formattedAmount} a été émise pour ${studentName}.`,
      emailSubject: 'Nouvelle facture',
      ctaLabel: 'Voir la facture',
      ctaPath: '/billing',
      data: { studentName, amount },
    });
  }

  /** G2 — A fee installment is unpaid: remind the parent. */
  async fanoutPaymentReminder(
    tenantId: string,
    parentUserId: string,
    body: string,
    installmentId: string,
  ): Promise<void> {
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.PAYMENT_REMINDER,
      title: 'Rappel de paiement',
      body,
      emailSubject: 'Rappel de paiement',
      ctaLabel: 'Voir mes factures',
      ctaPath: '/billing',
      data: { installmentId },
    });
  }

  /** G3 — A new observation is visible to the parent. */
  async fanoutObservation(
    tenantId: string,
    parentUserId: string,
    title: string,
    studentId: string,
  ): Promise<void> {
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.OBSERVATION,
      title: 'Nouvelle observation',
      body: title,
      emailSubject: 'Nouvelle observation',
      ctaLabel: 'Voir',
      ctaPath: '/observations',
      data: { studentId },
    });
  }

  /** An announcement was published to a set of users. */
  async fanoutAnnouncement(
    tenantId: string,
    userIds: string[],
    title: string,
  ): Promise<void> {
    await Promise.allSettled(
      userIds.map((userId) =>
        this.deliver({
          tenantId,
          userId,
          type: NotificationType.ANNOUNCEMENT,
          title: `Annonce : ${title}`,
          body: `Une nouvelle annonce a été publiée : ${title}.`,
          emailSubject: `Annonce : ${title}`,
          ctaLabel: "Voir l'annonce",
          ctaPath: '/announcements',
          data: { announcementTitle: title },
        }),
      ),
    );
  }

  /** T2b — A discipline incident was recorded for a student. */
  async fanoutDisciplineIncident(
    tenantId: string,
    parentUserId: string,
    studentName: string,
    severity: 'MINOR' | 'MAJOR' | 'SUSPENSION',
  ): Promise<void> {
    const severityLabel =
      severity === 'SUSPENSION' ? 'suspension' : severity === 'MAJOR' ? 'majeur' : 'mineur';
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.SYSTEM,
      title: `Incident de discipline — ${studentName}`,
      body: `Un incident de discipline (${severityLabel}) a été enregistré pour ${studentName}.`,
      emailSubject: `Incident de discipline — ${studentName}`,
      ctaLabel: "Voir l'incident",
      ctaPath: '/discipline',
      data: { studentName, severity },
    });
  }

  /** T2b — An infirmary visit ended in the student being sent home / an emergency. */
  async fanoutInfirmaryVisit(
    tenantId: string,
    parentUserId: string,
    studentName: string,
    outcome: 'SENT_HOME' | 'EMERGENCY',
  ): Promise<void> {
    const isEmergency = outcome === 'EMERGENCY';
    return this.deliver({
      tenantId,
      userId: parentUserId,
      type: NotificationType.SYSTEM,
      title: isEmergency
        ? `Urgence infirmerie — ${studentName}`
        : `Passage à l'infirmerie — ${studentName}`,
      body: isEmergency
        ? `${studentName} a été pris(e) en charge à l'infirmerie (urgence). Contactez l'établissement.`
        : `${studentName} a été renvoyé(e) à la maison après un passage à l'infirmerie.`,
      emailSubject: isEmergency
        ? `Urgence infirmerie — ${studentName}`
        : `Passage à l'infirmerie — ${studentName}`,
      ctaLabel: 'Voir le détail',
      ctaPath: '/health',
      data: { studentName, outcome },
    });
  }

  // ─── Core delivery (private) ───────────────────────────────────────────────

  private async deliver(input: DeliverInput): Promise<void> {
    // 1. In-app notification — primary channel. Swallow errors so a DB hiccup
    //    on this row never breaks the triggering business action.
    try {
      await this.notifications.create(input.tenantId, {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      });
    } catch (err) {
      this.logger.error(`in-app notification failed userId=${input.userId}: ${this.msg(err)}`);
    }

    // 2. Resolve recipient + delivery preferences (tenant-scoped).
    const user = await this.prisma.user
      .findFirst({
        where: { id: input.userId, tenantId: input.tenantId },
        select: {
          email: true,
          firstName: true,
          expoPushToken: true,
          pushEnabled: true,
          emailNotificationsEnabled: true,
        },
      })
      .catch((err) => {
        this.logger.error(`recipient lookup failed userId=${input.userId}: ${this.msg(err)}`);
        return null;
      });
    if (!user) return;

    const ctaUrl = `${this.webAppUrl}${input.ctaPath}`;

    // 3. Email (opt-in). ResendService never throws.
    if (user.emailNotificationsEnabled && user.email) {
      await this.resend.send({
        to: user.email,
        subject: input.emailSubject,
        template: createElement(NotificationEmail, {
          title: input.title,
          body: input.body,
          ctaLabel: input.ctaLabel,
          ctaUrl,
          notificationType: input.type,
          recipientName: user.firstName,
        }),
      });
    }

    // 4. Mobile push (opt-in). ExpoPushService never throws.
    if (user.pushEnabled && user.expoPushToken) {
      await this.push.send(user.expoPushToken, input.title, input.body, {
        ...input.data,
        type: input.type,
        url: ctaUrl,
      });
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
