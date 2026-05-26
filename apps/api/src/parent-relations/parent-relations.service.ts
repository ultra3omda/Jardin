import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateParentRelationDto,
  ListParentRelationsQueryDto,
  ListParentRelationsResponseDto,
  ParentRelationResponseDto,
  UpdateParentRelationDto,
} from './dto/parent-relation.dto';

/**
 * V3-A — Lien parent ↔ élève (N-N).
 *
 * Authorization :
 *  - SCHOOL_ADMIN : full CRUD au sein de son tenant
 *  - TEACHER / STAFF : read only
 *  - PARENT : read uniquement ses propres relations
 *  - SUPER_ADMIN : cross-tenant
 *
 * Invariants enforced :
 *  - parentUserId DOIT exister, role=PARENT, même tenant
 *  - studentId DOIT exister, même tenant
 *  - Unicité (parentUserId, studentId) au niveau DB
 */
@Injectable()
export class ParentRelationsService {
  private readonly logger = new Logger(ParentRelationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateParentRelationDto,
    currentUser: AuthenticatedUser,
  ): Promise<ParentRelationResponseDto> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }

    const parent = await this.prisma.user.findFirst({
      where: { id: dto.parentUserId, tenantId: currentUser.tenantId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!parent) {
      throw new NotFoundException({ code: 'PARENT_USER_NOT_FOUND' });
    }
    if (parent.role !== UserRole.PARENT) {
      throw new BadRequestException({ code: 'USER_NOT_PARENT_ROLE' });
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: currentUser.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    }

    try {
      const created = await this.prisma.parentStudent.create({
        data: {
          id: createId(),
          tenantId: currentUser.tenantId,
          parentUserId: dto.parentUserId,
          studentId: dto.studentId,
          relationType: dto.relationType,
          isPrimaryContact: dto.isPrimaryContact ?? false,
        },
      });
      return this.toResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'PARENT_STUDENT_LINK_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async list(
    query: ListParentRelationsQueryDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListParentRelationsResponseDto> {
    if (!query.studentId && !query.parentUserId) {
      throw new BadRequestException({ code: 'STUDENT_ID_OR_PARENT_USER_ID_REQUIRED' });
    }

    let effectiveQuery: ListParentRelationsQueryDto = query;
    if (currentUser.role === UserRole.PARENT) {
      if (query.parentUserId && query.parentUserId !== currentUser.id) {
        throw new ForbiddenException({ code: 'PARENT_CAN_ONLY_LIST_OWN_RELATIONS' });
      }
      effectiveQuery = { ...query, parentUserId: currentUser.id };
    }

    const where: Prisma.ParentStudentWhereInput = {};
    if (effectiveQuery.studentId) where.studentId = effectiveQuery.studentId;
    if (effectiveQuery.parentUserId) where.parentUserId = effectiveQuery.parentUserId;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.parentStudent.findMany({
        where,
        include: {
          parent: { select: { id: true, email: true, firstName: true, lastName: true } },
          student: {
            select: { id: true, firstName: true, lastName: true, classroom: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.parentStudent.count({ where }),
    ]);

    return { items: items.map((r) => this.toResponse(r)), total };
  }

  async update(
    id: string,
    dto: UpdateParentRelationDto,
    currentUser: AuthenticatedUser,
  ): Promise<ParentRelationResponseDto> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }

    const existing = await this.prisma.parentStudent.findFirst({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'PARENT_RELATION_NOT_FOUND' });
    }

    const updated = await this.prisma.parentStudent.update({
      where: { id },
      data: {
        ...(dto.relationType !== undefined ? { relationType: dto.relationType } : {}),
        ...(dto.isPrimaryContact !== undefined ? { isPrimaryContact: dto.isPrimaryContact } : {}),
      },
    });
    return this.toResponse(updated);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    if (!currentUser.tenantId) {
      throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    }

    const existing = await this.prisma.parentStudent.findFirst({ where: { id } });
    if (!existing) {
      throw new NotFoundException({ code: 'PARENT_RELATION_NOT_FOUND' });
    }
    await this.prisma.parentStudent.delete({ where: { id } });
  }

  private toResponse(row: {
    id: string;
    parentUserId: string;
    studentId: string;
    relationType: ParentRelationResponseDto['relationType'];
    isPrimaryContact: boolean;
    createdAt: Date;
    parent?: { id: string; email: string; firstName: string; lastName: string } | null;
    student?: {
      id: string;
      firstName: string;
      lastName: string;
      classroom: string;
    } | null;
  }): ParentRelationResponseDto {
    return {
      id: row.id,
      parentUserId: row.parentUserId,
      studentId: row.studentId,
      relationType: row.relationType,
      isPrimaryContact: row.isPrimaryContact,
      createdAt: row.createdAt,
      ...(row.parent ? { parent: row.parent } : {}),
      ...(row.student ? { student: row.student } : {}),
    };
  }
}
