import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { ObservationMediaKind } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import {
  BulkObservationDto,
  CreateObservationDto,
  UpdateObservationDto,
} from './dto/observations.dto';

const MEDIA_EXT: Record<string, { ext: string; kind: ObservationMediaKind }> = {
  'image/jpeg': { ext: 'jpg', kind: ObservationMediaKind.PHOTO },
  'image/png': { ext: 'png', kind: ObservationMediaKind.PHOTO },
  'image/webp': { ext: 'webp', kind: ObservationMediaKind.PHOTO },
  'video/mp4': { ext: 'mp4', kind: ObservationMediaKind.VIDEO },
  'video/quicktime': { ext: 'mov', kind: ObservationMediaKind.VIDEO },
};
const MEDIA_TTL_S = 300;

/**
 * G3 — Observations pédagogiques catégorisées, individuelles ou multi-élèves,
 * avec photos/vidéos. Un PARENT ne voit que ses enfants ET visibleToParent=true.
 */
@Injectable()
export class ObservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly fanout: NotificationFanoutService,
    private readonly config: ConfigService,
  ) {}

  async list(
    user: AuthenticatedUser,
    filters: { studentId?: string; classId?: string; category?: string },
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
    return this.prisma.observation.findMany({
      where: {
        tenantId: user.tenantId!,
        deletedAt: null,
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
        ...(filters.category ? { category: filters.category as never } : {}),
        ...(filters.classId ? { student: { classId: filters.classId } } : {}),
        ...(isParent ? { studentId: { in: childIds! }, visibleToParent: true } : {}),
      },
      include: { media: true },
      orderBy: { observedAt: 'desc' },
      take: 500,
    });
  }

  async create(tenantId: string, authorId: string, dto: CreateObservationDto) {
    const obs = await this.prisma.observation.create({
      data: {
        id: createId(),
        tenantId,
        studentId: dto.studentId,
        authorId,
        category: dto.category,
        title: dto.title,
        content: dto.content,
        observedAt: new Date(dto.observedAt),
        visibleToParent: dto.visibleToParent ?? true,
        media: dto.media?.length
          ? {
              create: dto.media.map((m) => ({
                id: createId(),
                tenantId,
                kind: m.kind,
                url: m.url,
              })),
            }
          : undefined,
      },
      include: { media: true },
    });
    if (obs.visibleToParent) await this.notifyParents(tenantId, dto.studentId, dto.title);
    return obs;
  }

  /** Même observation pour N élèves — batchId partagé. */
  async bulkCreate(tenantId: string, authorId: string, dto: BulkObservationDto) {
    const batchId = createId();
    let created = 0;
    for (const studentId of dto.studentIds) {
      const obs = await this.prisma.observation.create({
        data: {
          id: createId(),
          tenantId,
          studentId,
          authorId,
          batchId,
          category: dto.category,
          title: dto.title,
          content: dto.content,
          observedAt: new Date(dto.observedAt),
          visibleToParent: dto.visibleToParent ?? true,
        },
      });
      if (obs.visibleToParent) await this.notifyParents(tenantId, studentId, dto.title);
      created++;
    }
    return { batchId, created };
  }

  private async notifyParents(tenantId: string, studentId: string, title: string) {
    const rels = await this.prisma.parentStudent.findMany({
      where: { tenantId, studentId },
      select: { parentUserId: true },
    });
    for (const r of rels) {
      await this.fanout.fanoutObservation(tenantId, r.parentUserId, title, studentId);
    }
  }

  async update(tenantId: string, id: string, dto: UpdateObservationDto) {
    const obs = await this.prisma.observation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!obs) throw new NotFoundException('Observation not found');
    return this.prisma.observation.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.visibleToParent !== undefined ? { visibleToParent: dto.visibleToParent } : {}),
      },
      include: { media: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const obs = await this.prisma.observation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!obs) throw new NotFoundException('Observation not found');
    await this.prisma.observation.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async mediaUploadUrl(tenantId: string, contentType: string) {
    const meta = MEDIA_EXT[contentType];
    if (!meta) throw new BadRequestException({ code: 'MEDIA_CONTENT_TYPE_FORBIDDEN' });
    const bucket = this.config.get<string>('r2.tenantAssetsBucket', 'ecole-saas-tenant-assets');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const key = `observations/${tenantId}/${createId()}.${meta.ext}`;
    const uploadUrl = await this.r2.signedPutUrl(key, contentType, MEDIA_TTL_S, bucket);
    const finalUrl = publicUrl ? `${publicUrl}/${key}` : `r2://${bucket}/${key}`;
    return { uploadUrl, finalUrl, kind: meta.kind, expiresIn: MEDIA_TTL_S };
  }
}
