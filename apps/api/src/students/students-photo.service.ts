import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';

/**
 * V2 — Module Élèves : signed PUT URL R2 pour upload photo.
 * Réutilise le pattern V1.6 tenant-brand (R2Service.signedPutUrl).
 *
 * RBAC : SCHOOL_ADMIN uniquement (guard côté controller).
 * Le finalUrl est calculé côté serveur — c'est ce que le front PATCH ensuite
 * sur l'étudiant via PATCH /students/:id { photoUrl }.
 */
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED_MIMES)[number];
const UPLOAD_TTL_S = 300; // 5 minutes

export interface PhotoUploadResult {
  uploadUrl: string;
  finalUrl: string;
  expiresIn: number;
}

@Injectable()
export class StudentsPhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  async getPhotoUploadUrl(
    studentId: string,
    contentType: string,
    currentUser: AuthenticatedUser,
  ): Promise<PhotoUploadResult> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    if (!ALLOWED_MIMES.includes(contentType as AllowedMime)) {
      throw new BadRequestException({
        code: 'PHOTO_CONTENT_TYPE_FORBIDDEN',
        message: `contentType "${contentType}" interdit (autorisés : ${ALLOWED_MIMES.join(', ')})`,
      });
    }
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, deletedAt: null },
    });
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }

    const ext: 'jpg' | 'png' | 'webp' =
      contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const bucket = this.config.get<string>('r2.tenantAssetsBucket', 'ecole-saas-tenant-assets');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const key = `students/${currentUser.tenantId}/${studentId}/photo-${createId()}.${ext}`;

    const uploadUrl = await this.r2.signedPutUrl(key, contentType, UPLOAD_TTL_S, bucket);
    const finalUrl = publicUrl ? `${publicUrl}/${key}` : `r2://${bucket}/${key}`;

    return { uploadUrl, finalUrl, expiresIn: UPLOAD_TTL_S };
  }
}
