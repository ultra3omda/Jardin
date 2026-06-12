import { Injectable } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { SmsStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * G2 — Historique des SMS envoyés (EducaKids avait `HistoSMS`, Klasso n'en avait
 * aucun). Best-effort : on journalise chaque envoi (succès/échec/skip) avec le
 * numéro masqué (4 derniers chiffres) pour ne jamais persister de PII complète.
 */
@Injectable()
export class SmsLogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Masque tout sauf les 4 derniers chiffres. */
  private mask(phone: string | null | undefined): string {
    const p = (phone ?? '').replace(/\s/g, '');
    return p.length <= 4 ? '****' : `****${p.slice(-4)}`;
  }

  async record(params: {
    tenantId: string;
    to: string | null | undefined;
    body: string;
    status: SmsStatus;
    context?: string;
    relatedId?: string;
  }): Promise<void> {
    await this.prisma.smsLog.create({
      data: {
        id: createId(),
        tenantId: params.tenantId,
        toMasked: this.mask(params.to),
        body: params.body,
        status: params.status,
        context: params.context,
        relatedId: params.relatedId,
      },
    });
  }
}
