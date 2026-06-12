import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import { NotificationFanoutService } from '../notifications/notification-fanout.service';
import { ActivityReportPdfService } from './activity-report-pdf.service';
import { UpsertReportDto } from './dto/activity-report.dto';

const PHOTO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const PHOTO_TTL_S = 300;

/**
 * G5 — Rapports d'activité PDF. 1 rapport / activité, rendu à la demande
 * (mirror bulletins). Notif aux parents des participants ; PARENT limité aux
 * activités auxquelles son enfant participe.
 */
@Injectable()
export class ActivityReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly pdf: ActivityReportPdfService,
    private readonly fanout: NotificationFanoutService,
    private readonly config: ConfigService,
  ) {}

  private async loadActivity(tenantId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, tenantId, deletedAt: null },
      include: {
        tenant: { select: { name: true } },
        participations: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  async upsert(tenantId: string, userId: string, activityId: string, dto: UpsertReportDto) {
    const activity = await this.loadActivity(tenantId, activityId);
    const report = await this.prisma.activityReport.upsert({
      where: { activityId },
      create: {
        id: createId(),
        tenantId,
        activityId,
        title: dto.title,
        summary: dto.summary,
        photoUrls: dto.photoUrls ?? [],
        visibleToParent: dto.visibleToParent ?? true,
        generatedById: userId,
      },
      update: {
        title: dto.title,
        summary: dto.summary,
        photoUrls: dto.photoUrls ?? [],
        visibleToParent: dto.visibleToParent ?? true,
        generatedById: userId,
        generatedAt: new Date(),
      },
    });

    if (report.visibleToParent) {
      const studentIds = activity.participations.map((p) => p.student.id);
      if (studentIds.length > 0) {
        const rels = await this.prisma.parentStudent.findMany({
          where: { tenantId, studentId: { in: studentIds } },
          select: { parentUserId: true },
        });
        const unique = [...new Set(rels.map((r) => r.parentUserId))];
        for (const parentUserId of unique) {
          await this.fanout.fanoutActivityReport(
            tenantId,
            parentUserId,
            activity.name,
            dto.title,
            activityId,
          );
        }
      }
    }
    return report;
  }

  /** Métadonnées du rapport. PARENT : visible + son enfant participe, sinon null. */
  async get(tenantId: string, activityId: string, user: AuthenticatedUser) {
    const report = await this.prisma.activityReport.findFirst({
      where: { tenantId, activityId },
    });
    if (!report) return null;
    if (user.role === 'PARENT') {
      if (!report.visibleToParent) return null;
      const childIds = (
        await this.prisma.parentStudent.findMany({
          where: { tenantId, parentUserId: user.id },
          select: { studentId: true },
        })
      ).map((r) => r.studentId);
      const participates = await this.prisma.activityParticipation.findFirst({
        where: { tenantId, activityId, studentId: { in: childIds } },
        select: { id: true },
      });
      if (!participates) return null;
    }
    return report;
  }

  /** Rendu PDF à la demande. PARENT : son enfant doit participer à l'activité. */
  async getPdf(tenantId: string, activityId: string, user: AuthenticatedUser): Promise<Buffer> {
    const report = await this.prisma.activityReport.findFirst({
      where: { tenantId, activityId },
    });
    if (!report) throw new NotFoundException('Report not found');

    const activity = await this.loadActivity(tenantId, activityId);

    if (user.role === 'PARENT') {
      if (!report.visibleToParent) throw new ForbiddenException({ code: 'REPORT_NOT_VISIBLE' });
      const childIds = (
        await this.prisma.parentStudent.findMany({
          where: { tenantId, parentUserId: user.id },
          select: { studentId: true },
        })
      ).map((r) => r.studentId);
      const participates = activity.participations.some((p) => childIds.includes(p.student.id));
      if (!participates) throw new ForbiddenException({ code: 'CHILD_NOT_PARTICIPANT' });
    }

    return this.pdf.render({
      schoolName: activity.tenant.name,
      activityName: activity.name,
      date: activity.scheduledAt?.toISOString() ?? '',
      title: report.title,
      summary: report.summary,
      photoUrls: report.photoUrls,
      participants: activity.participations.map(
        (p) => `${p.student.firstName} ${p.student.lastName}`,
      ),
    });
  }

  async photoUploadUrl(tenantId: string, activityId: string, contentType: string) {
    const ext = PHOTO_EXT[contentType];
    if (!ext) throw new BadRequestException({ code: 'PHOTO_CONTENT_TYPE_FORBIDDEN' });
    const bucket = this.config.get<string>('r2.tenantAssetsBucket', 'ecole-saas-tenant-assets');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const key = `activity-reports/${tenantId}/${activityId}/${createId()}.${ext}`;
    const uploadUrl = await this.r2.signedPutUrl(key, contentType, PHOTO_TTL_S, bucket);
    const finalUrl = publicUrl ? `${publicUrl}/${key}` : `r2://${bucket}/${key}`;
    return { uploadUrl, finalUrl, expiresIn: PHOTO_TTL_S };
  }
}
