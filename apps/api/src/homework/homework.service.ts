import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, SubmissionStatus, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import type {
  ChildHomeworkDto,
  CreateHomeworkDto,
  HomeworkAttachmentUploadResponseDto,
  HomeworkResponseDto,
  HomeworkWithSubmissionsDto,
  ListChildHomeworkResponseDto,
  ListHomeworkResponseDto,
  UpdateHomeworkDto,
  UpsertSubmissionDto,
} from './dto/homework.dto';

const ATTACHMENT_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const UPLOAD_TTL_S = 300;

const HOMEWORK_INCLUDE = {
  class: { select: { name: true } },
  subject: { select: { name: true } },
  submissions: { select: { status: true } },
} satisfies Prisma.HomeworkInclude;

type HomeworkRow = Prisma.HomeworkGetPayload<{ include: typeof HOMEWORK_INCLUDE }>;

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  private tenant(user: AuthenticatedUser): string {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    return user.tenantId;
  }

  /** A teacher may only act on a class they are assigned to; admins on any. */
  private async assertCanManageClass(classId: string, user: AuthenticatedUser): Promise<void> {
    const tenantId = this.tenant(user);
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!cls) throw new NotFoundException({ code: 'CLASS_NOT_FOUND' });
    if (user.role === UserRole.TEACHER) {
      const owns = await this.prisma.classTeacher.findFirst({
        where: { tenantId, classId, teacherUserId: user.id },
        select: { id: true },
      });
      if (!owns) throw new ForbiddenException({ code: 'NOT_CLASS_TEACHER' });
    }
  }

  async create(dto: CreateHomeworkDto, user: AuthenticatedUser): Promise<HomeworkResponseDto> {
    const tenantId = this.tenant(user);
    await this.assertCanManageClass(dto.classId, user);
    const created = await this.prisma.homework.create({
      data: {
        id: createId(),
        tenantId,
        classId: dto.classId,
        subjectId: dto.subjectId ?? null,
        createdById: user.id,
        title: dto.title.trim(),
        instructions: dto.instructions.trim(),
        attachmentUrl: dto.attachmentUrl ?? null,
        dueDate: new Date(dto.dueDate),
      },
      include: HOMEWORK_INCLUDE,
    });
    return this.toResponse(created);
  }

  async list(classId: string | undefined, user: AuthenticatedUser): Promise<ListHomeworkResponseDto> {
    const tenantId = this.tenant(user);
    const where: Prisma.HomeworkWhereInput = {
      tenantId,
      deletedAt: null,
      ...(classId ? { classId } : {}),
    };
    // A teacher only sees homework of classes they are assigned to.
    if (user.role === UserRole.TEACHER) {
      const assigned = await this.prisma.classTeacher.findMany({
        where: { tenantId, teacherUserId: user.id },
        select: { classId: true },
      });
      where.classId = classId
        ? classId
        : { in: assigned.map((a) => a.classId) };
    }
    const rows = await this.prisma.homework.findMany({
      where,
      include: HOMEWORK_INCLUDE,
      orderBy: { dueDate: 'desc' },
    });
    return { items: rows.map((r) => this.toResponse(r)), total: rows.length };
  }

  async findById(id: string, user: AuthenticatedUser): Promise<HomeworkWithSubmissionsDto> {
    const tenantId = this.tenant(user);
    const hw = await this.prisma.homework.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        ...HOMEWORK_INCLUDE,
        submissions: {
          include: { student: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!hw) throw new NotFoundException({ code: 'HOMEWORK_NOT_FOUND' });
    if (user.role === UserRole.TEACHER) await this.assertCanManageClass(hw.classId, user);

    // Roster = class students; merge with any existing submissions.
    const students = await this.prisma.student.findMany({
      where: { tenantId, classId: hw.classId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    });
    const byStudent = new Map(hw.submissions.map((s) => [s.studentId, s]));
    const submissions = students.map((st) => {
      const sub = byStudent.get(st.id);
      return {
        id: sub?.id ?? '',
        studentId: st.id,
        studentName: `${st.firstName} ${st.lastName}`,
        status: sub?.status ?? SubmissionStatus.PENDING,
        submittedAt: sub?.submittedAt ?? null,
        feedback: sub?.feedback ?? null,
      };
    });
    return { homework: this.toResponse(hw as HomeworkRow), submissions };
  }

  async update(id: string, dto: UpdateHomeworkDto, user: AuthenticatedUser): Promise<HomeworkResponseDto> {
    const tenantId = this.tenant(user);
    const hw = await this.prisma.homework.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, classId: true },
    });
    if (!hw) throw new NotFoundException({ code: 'HOMEWORK_NOT_FOUND' });
    await this.assertCanManageClass(hw.classId, user);
    const updated = await this.prisma.homework.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions.trim() } : {}),
        ...(dto.attachmentUrl !== undefined ? { attachmentUrl: dto.attachmentUrl } : {}),
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
      },
      include: HOMEWORK_INCLUDE,
    });
    return this.toResponse(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const tenantId = this.tenant(user);
    const hw = await this.prisma.homework.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, classId: true },
    });
    if (!hw) throw new NotFoundException({ code: 'HOMEWORK_NOT_FOUND' });
    await this.assertCanManageClass(hw.classId, user);
    await this.prisma.homework.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Teacher tracks a student's submission (upsert by homework+student). */
  async upsertSubmission(
    homeworkId: string,
    dto: UpsertSubmissionDto,
    user: AuthenticatedUser,
  ): Promise<HomeworkWithSubmissionsDto> {
    const tenantId = this.tenant(user);
    const hw = await this.prisma.homework.findFirst({
      where: { id: homeworkId, tenantId, deletedAt: null },
      select: { id: true, classId: true },
    });
    if (!hw) throw new NotFoundException({ code: 'HOMEWORK_NOT_FOUND' });
    await this.assertCanManageClass(hw.classId, user);
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId, classId: hw.classId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new BadRequestException({ code: 'STUDENT_NOT_IN_CLASS' });

    const submittedAt =
      dto.status === SubmissionStatus.PENDING ? null : new Date();
    await this.prisma.homeworkSubmission.upsert({
      where: { unique_submission_per_student: { homeworkId, studentId: dto.studentId } },
      update: { status: dto.status, feedback: dto.feedback ?? null, submittedAt },
      create: {
        id: createId(),
        tenantId,
        homeworkId,
        studentId: dto.studentId,
        status: dto.status,
        feedback: dto.feedback ?? null,
        submittedAt,
      },
    });
    return this.findById(homeworkId, user);
  }

  /** PARENT — homework for the parent's children's classes, with each child's status. */
  async myChildren(user: AuthenticatedUser): Promise<ListChildHomeworkResponseDto> {
    const tenantId = this.tenant(user);
    const links = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId: user.id, student: { deletedAt: null } },
      select: {
        student: {
          select: { id: true, firstName: true, lastName: true, classId: true },
        },
      },
    });
    const items: ChildHomeworkDto[] = [];
    for (const { student } of links) {
      if (!student.classId) continue;
      const rows = await this.prisma.homework.findMany({
        where: { tenantId, deletedAt: null, classId: student.classId },
        include: {
          class: { select: { name: true } },
          subject: { select: { name: true } },
          submissions: { where: { studentId: student.id }, select: { status: true } },
        },
        orderBy: { dueDate: 'desc' },
      });
      for (const hw of rows) {
        items.push({
          id: hw.id,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          className: hw.class.name,
          subjectName: hw.subject?.name ?? null,
          title: hw.title,
          instructions: hw.instructions,
          attachmentUrl: hw.attachmentUrl,
          dueDate: hw.dueDate,
          status: hw.submissions[0]?.status ?? SubmissionStatus.PENDING,
        });
      }
    }
    items.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
    return { items, total: items.length };
  }

  async getAttachmentUploadUrl(
    contentType: string,
    user: AuthenticatedUser,
  ): Promise<HomeworkAttachmentUploadResponseDto> {
    const tenantId = this.tenant(user);
    const ext = ATTACHMENT_EXT[contentType];
    if (!ext) throw new BadRequestException({ code: 'ATTACHMENT_CONTENT_TYPE_FORBIDDEN' });
    const bucket = this.config.get<string>('r2.tenantAssetsBucket', 'ecole-saas-tenant-assets');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const key = `homework/${tenantId}/${createId()}.${ext}`;
    const uploadUrl = await this.r2.signedPutUrl(key, contentType, UPLOAD_TTL_S, bucket);
    const finalUrl = publicUrl ? `${publicUrl}/${key}` : `r2://${bucket}/${key}`;
    return { uploadUrl, finalUrl, expiresIn: UPLOAD_TTL_S };
  }

  private toResponse(hw: HomeworkRow): HomeworkResponseDto {
    const submissionCount = hw.submissions.length;
    const submittedCount = hw.submissions.filter(
      (s) => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.LATE,
    ).length;
    return {
      id: hw.id,
      classId: hw.classId,
      className: hw.class.name,
      subjectId: hw.subjectId,
      subjectName: hw.subject?.name ?? null,
      title: hw.title,
      instructions: hw.instructions,
      attachmentUrl: hw.attachmentUrl,
      dueDate: hw.dueDate,
      createdById: hw.createdById,
      submissionCount,
      submittedCount,
      createdAt: hw.createdAt,
      updatedAt: hw.updatedAt,
    };
  }
}
