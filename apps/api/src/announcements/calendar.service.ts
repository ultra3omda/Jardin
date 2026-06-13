import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';

import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import { CreateEventDto } from './dto/calendar.dto';

const ATTACHMENT_TTL_S = 300;

/**
 * G8 — Calendrier scolaire (vacances, jours fériés, événements) + pièces
 * jointes PDF pour les circulaires.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  list(tenantId: string, schoolYear?: string) {
    return this.prisma.schoolCalendarEvent.findMany({
      where: { tenantId, deletedAt: null, ...(schoolYear ? { schoolYear } : {}) },
      orderBy: { startDate: 'asc' },
    });
  }

  create(tenantId: string, dto: CreateEventDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException({ code: 'END_BEFORE_START' });
    return this.prisma.schoolCalendarEvent.create({
      data: {
        id: createId(),
        tenantId,
        title: dto.title,
        type: dto.type,
        startDate: start,
        endDate: end,
        schoolYear: dto.schoolYear,
        notes: dto.notes ?? null,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const e = await this.prisma.schoolCalendarEvent.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!e) throw new NotFoundException('Event not found');
    await this.prisma.schoolCalendarEvent.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** URL signée pour joindre un PDF de circulaire. */
  async attachmentUploadUrl(tenantId: string, contentType: string) {
    if (contentType !== 'application/pdf') {
      throw new BadRequestException({ code: 'ATTACHMENT_MUST_BE_PDF' });
    }
    const bucket = this.config.get<string>('r2.tenantAssetsBucket', 'ecole-saas-tenant-assets');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const key = `circulars/${tenantId}/${createId()}.pdf`;
    const uploadUrl = await this.r2.signedPutUrl(key, contentType, ATTACHMENT_TTL_S, bucket);
    const finalUrl = publicUrl ? `${publicUrl}/${key}` : `r2://${bucket}/${key}`;
    return { uploadUrl, finalUrl, expiresIn: ATTACHMENT_TTL_S };
  }
}
