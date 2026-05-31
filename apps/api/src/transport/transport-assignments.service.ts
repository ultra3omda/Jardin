import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateTransportAssignmentDto,
  ListTransportAssignmentsQueryDto,
  ListTransportAssignmentsResponseDto,
  TransportAssignmentResponseDto,
  UpdateTransportAssignmentDto,
} from './dto/transport-assignment.dto';

type Row = Prisma.TransportAssignmentGetPayload<{
  include: { student: true; route: true; stop: true };
}>;

@Injectable()
export class TransportAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListTransportAssignmentsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListTransportAssignmentsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.TransportAssignmentWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
    };
    if (query.routeId) where.routeId = query.routeId;
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.transportAssignment.findMany({
        where,
        include: { student: true, route: true, stop: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.transportAssignment.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<TransportAssignmentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.transportAssignment.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true, route: true, stop: true },
    });
    if (!row) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async create(
    dto: CreateTransportAssignmentDto,
    user: AuthenticatedUser,
  ): Promise<TransportAssignmentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const [student, route] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.busRoute.findFirst({
        where: { id: dto.routeId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    if (!route) throw new NotFoundException({ code: 'BUS_ROUTE_NOT_FOUND' });
    if (dto.stopId) {
      const stop = await this.prisma.busStop.findFirst({
        where: { id: dto.stopId, tenantId: user.tenantId, routeId: dto.routeId },
        select: { id: true },
      });
      if (!stop) throw new NotFoundException({ code: 'BUS_STOP_NOT_FOUND' });
    }
    try {
      const created = await this.prisma.transportAssignment.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          studentId: dto.studentId,
          routeId: dto.routeId,
          stopId: dto.stopId ?? null,
          direction: dto.direction ?? 'BOTH',
        },
        include: { student: true, route: true, stop: true },
      });
      return this.toResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'ASSIGNMENT_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateTransportAssignmentDto,
    user: AuthenticatedUser,
  ): Promise<TransportAssignmentResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.transportAssignment.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND' });
    if (dto.stopId !== undefined && dto.stopId !== null) {
      const stop = await this.prisma.busStop.findFirst({
        where: { id: dto.stopId, tenantId: user.tenantId, routeId: existing.routeId },
        select: { id: true },
      });
      if (!stop) throw new NotFoundException({ code: 'BUS_STOP_NOT_FOUND' });
    }
    const row = await this.prisma.transportAssignment.update({
      where: { id },
      data: {
        ...(dto.stopId !== undefined ? { stopId: dto.stopId } : {}),
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
      },
      include: { student: true, route: true, stop: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.transportAssignment.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND' });
    await this.prisma.transportAssignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private toResponse(r: Row): TransportAssignmentResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      routeId: r.routeId,
      routeName: r.route.name,
      stopId: r.stopId,
      stopName: r.stop ? r.stop.name : null,
      direction: r.direction,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
