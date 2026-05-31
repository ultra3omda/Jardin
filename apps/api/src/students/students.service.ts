import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateStudentDto,
  ListStudentsQueryDto,
  ListStudentsResponseDto,
  StudentResponseDto,
  UpdateStudentDto,
} from './dto/student.dto';

/** Lot 3 — résumé de la classe rattachée joint à chaque réponse élève. */
const STUDENT_CLASS_INCLUDE = {
  class: { select: { id: true, name: true, level: true } },
} satisfies Prisma.StudentInclude;

type StudentWithClass = Prisma.StudentGetPayload<{ include: typeof STUDENT_CLASS_INCLUDE }>;

/**
 * V2 — Module Élèves : Service métier.
 * RBAC : SCHOOL_ADMIN full / TEACHER read tous tenant / PARENT read ses enfants
 * (filtré par parentEmail = currentUser.email) / STAFF read all.
 * Multi-tenant : tenantId auto-injecté via tenant.extension (TENANT_SCOPED_MODELS = ['Student',...]).
 */
@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateStudentDto,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<StudentResponseDto> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }

    const studentId = createId();
    const student = await this.prisma.$transaction(async (tx) => {
      const assignment = await this.resolveClassAssignment(tx, currentUser.tenantId!, dto);
      if (!assignment) {
        throw new BadRequestException({ code: 'CLASS_OR_CLASSROOM_REQUIRED' });
      }

      const created = await tx.student.create({
        data: {
          id: studentId,
          tenantId: currentUser.tenantId!,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          dateOfBirth: new Date(dto.dateOfBirth),
          sex: dto.sex,
          nationality: dto.nationality ?? null,
          classroom: assignment.classroom,
          classId: assignment.classId,
          enrollmentDate: dto.enrollmentDate ? new Date(dto.enrollmentDate) : new Date(),
          previousSchooling: dto.previousSchooling ?? null,
          parentEmail: dto.parentEmail.trim().toLowerCase(),
          siblingsCount: dto.siblingsCount ?? 0,
          addressLine: dto.addressLine ?? null,
          city: dto.city ?? null,
          postalCode: dto.postalCode ?? null,
          country: dto.country ?? 'TN',
          motherTongue: dto.motherTongue ?? null,
          medicalNotes: dto.medicalNotes ?? null,
          photoUrl: dto.photoUrl ?? null,
        },
        include: STUDENT_CLASS_INCLUDE,
      });

      await tx.auditLog.create({
        data: {
          id: createId(),
          action: 'student.created',
          resource: 'student',
          tenantId: currentUser.tenantId!,
          userId: currentUser.id,
          metadata: { studentId: created.id, classroom: created.classroom },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      return created;
    });

    return this.toResponse(student);
  }

  async list(
    query: ListStudentsQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListStudentsResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const isParent = currentUser.role === UserRole.PARENT;
    const search = query.search?.trim();
    const classroom = query.classroom?.trim();
    const classId = query.classId?.trim();

    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }

    const where: Prisma.StudentWhereInput = {
      tenantId: currentUser.tenantId,
      deletedAt: null,
      ...(isParent ? { parentEmail: currentUser.email.toLowerCase() } : {}),
      ...(classId ? { classId } : {}),
      ...(classroom ? { classroom } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: STUDENT_CLASS_INCLUDE,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toResponse(r)),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string, currentUser: AuthenticatedUser): Promise<StudentResponseDto> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId: currentUser.tenantId, deletedAt: null },
      include: STUDENT_CLASS_INCLUDE,
    });
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }
    if (
      currentUser.role === UserRole.PARENT &&
      student.parentEmail.toLowerCase() !== currentUser.email.toLowerCase()
    ) {
      throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
    }
    return this.toResponse(student);
  }

  async update(
    id: string,
    dto: UpdateStudentDto,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<StudentResponseDto> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    const existing = await this.prisma.student.findFirst({
      where: { id, tenantId: currentUser.tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Lot 3 — si classId ou classroom change, on re-résout la classe et on
      // garde `classroom` synchronisé avec le nom de la classe rattachée.
      let classFields: { classId: string | null; classroom: string } | undefined;
      if (dto.classId !== undefined || dto.classroom !== undefined) {
        const assignment = await this.resolveClassAssignment(tx, existing.tenantId, dto);
        if (assignment) classFields = assignment;
      }

      const data: Prisma.StudentUpdateInput = {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
        ...(dto.sex !== undefined ? { sex: dto.sex } : {}),
        ...(dto.nationality !== undefined ? { nationality: dto.nationality } : {}),
        ...(classFields
          ? { classroom: classFields.classroom, class: classFields.classId ? { connect: { id: classFields.classId } } : { disconnect: true } }
          : {}),
        ...(dto.enrollmentDate !== undefined ? { enrollmentDate: new Date(dto.enrollmentDate) } : {}),
        ...(dto.previousSchooling !== undefined ? { previousSchooling: dto.previousSchooling } : {}),
        ...(dto.parentEmail !== undefined ? { parentEmail: dto.parentEmail.trim().toLowerCase() } : {}),
        ...(dto.siblingsCount !== undefined ? { siblingsCount: dto.siblingsCount } : {}),
        ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.motherTongue !== undefined ? { motherTongue: dto.motherTongue } : {}),
        ...(dto.medicalNotes !== undefined ? { medicalNotes: dto.medicalNotes } : {}),
        ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
      };

      const next = await tx.student.update({ where: { id }, data, include: STUDENT_CLASS_INCLUDE });

      await tx.auditLog.create({
        data: {
          id: createId(),
          action: 'student.updated',
          resource: 'student',
          tenantId: existing.tenantId,
          userId: currentUser.id,
          metadata: { studentId: id, fields: Object.keys(data) },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      return next;
    });

    return this.toResponse(updated);
  }

  async softDelete(
    id: string,
    currentUser: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<void> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }
    const existing = await this.prisma.student.findFirst({
      where: { id, tenantId: currentUser.tenantId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          id: createId(),
          action: 'student.deleted',
          resource: 'student',
          tenantId: existing.tenantId,
          userId: currentUser.id,
          metadata: { studentId: id },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });
  }

  // ===== Private =====

  /**
   * Lot 3 — résout la classe d'un élève à partir de `classId` (prioritaire) ou
   * du nom `classroom`. Renvoie toujours un `classroom` synchronisé avec le nom
   * de la classe quand un `classId` est résolu. Retourne `null` si ni l'un ni
   * l'autre n'est fourni (le caller décide si c'est une erreur).
   */
  private async resolveClassAssignment(
    tx: Prisma.TransactionClient,
    tenantId: string,
    input: { classId?: string; classroom?: string },
  ): Promise<{ classId: string | null; classroom: string } | null> {
    const classId = input.classId?.trim();
    if (classId) {
      const cls = await tx.class.findFirst({
        where: { id: classId, tenantId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!cls) {
        throw new BadRequestException({ code: 'CLASS_NOT_FOUND' });
      }
      return { classId: cls.id, classroom: cls.name };
    }

    const classroom = input.classroom?.trim();
    if (classroom) {
      // Résolution best-effort par nom (année scolaire la plus récente). `classId`
      // reste null si aucune classe ne correspond — l'élève garde son `classroom` texte.
      const cls = await tx.class.findFirst({
        where: { tenantId, name: classroom, deletedAt: null },
        orderBy: { schoolYear: 'desc' },
        select: { id: true },
      });
      return { classId: cls?.id ?? null, classroom };
    }

    return null;
  }

  private toResponse(row: StudentWithClass): StudentResponseDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      firstName: row.firstName,
      lastName: row.lastName,
      dateOfBirth: row.dateOfBirth.toISOString().slice(0, 10),
      sex: row.sex,
      nationality: row.nationality,
      classroom: row.classroom,
      classId: row.classId,
      class: row.class ? { id: row.class.id, name: row.class.name, level: row.class.level } : null,
      enrollmentDate: row.enrollmentDate.toISOString().slice(0, 10),
      previousSchooling: row.previousSchooling,
      parentEmail: row.parentEmail,
      siblingsCount: row.siblingsCount,
      addressLine: row.addressLine,
      city: row.city,
      postalCode: row.postalCode,
      country: row.country,
      motherTongue: row.motherTongue,
      medicalNotes: row.medicalNotes,
      photoUrl: row.photoUrl,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
