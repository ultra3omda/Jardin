import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { ANNUAL_LEAVE_ALLOWANCE_DAYS } from '@ecole-saas/shared';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateLeaveRequestDto,
  LeaveBalanceQueryDto,
  LeaveBalanceResponseDto,
  LeaveRequestResponseDto,
  ListLeavesQueryDto,
  ListLeavesResponseDto,
  ReviewLeaveRequestDto,
} from './dto/leave-request.dto';

type Row = Prisma.LeaveRequestGetPayload<Record<string, never>>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Inclusive calendar-day count between two dates (MVP — no weekend/holiday logic). */
export function computeLeaveDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
}

/** Remaining paid-leave balance = allowance − approved PAID days taken. */
export function computeBalance(
  approvedPaid: ReadonlyArray<{ startDate: Date; endDate: Date }>,
  allowanceDays: number = ANNUAL_LEAVE_ALLOWANCE_DAYS,
): { takenDays: number; remainingDays: number } {
  const takenDays = approvedPaid.reduce((sum, l) => sum + computeLeaveDays(l.startDate, l.endDate), 0);
  return { takenDays, remainingDays: allowanceDays - takenDays };
}

function isHrAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.SCHOOL_ADMIN || user.role === UserRole.SUPER_ADMIN;
}

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListLeavesQueryDto, user: AuthenticatedUser): Promise<ListLeavesResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.LeaveRequestWhereInput = { tenantId: user.tenantId, deletedAt: null };
    where.userId = isHrAdmin(user) ? query.userId : user.id;
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<LeaveRequestResponseDto> {
    return this.toResponse(await this.findOrThrow(id, user));
  }

  async create(
    dto: CreateLeaveRequestDto,
    user: AuthenticatedUser,
  ): Promise<LeaveRequestResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end.getTime() < start.getTime()) {
      throw new BadRequestException({ code: 'END_BEFORE_START' });
    }
    // Employees may only file for themselves; admins may file on behalf of an employee.
    const targetUserId = isHrAdmin(user) ? (dto.userId ?? user.id) : user.id;
    if (targetUserId !== user.id) {
      const employee = await this.prisma.user.findFirst({
        where: { id: targetUserId, tenantId: user.tenantId, deletedAt: null },
      });
      if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND' });
    }
    const row = await this.prisma.leaveRequest.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: targetUserId,
        type: dto.type,
        startDate: start,
        endDate: end,
        reason: dto.reason ?? null,
      },
    });
    return this.toResponse(row);
  }

  async review(
    id: string,
    dto: ReviewLeaveRequestDto,
    user: AuthenticatedUser,
  ): Promise<LeaveRequestResponseDto> {
    if (!isHrAdmin(user)) throw new ForbiddenException({ code: 'HR_ADMIN_REQUIRED' });
    const existing = await this.findOrThrow(id, user);
    // An admin can never approve/reject their own leave.
    if (existing.userId === user.id) {
      throw new ForbiddenException({ code: 'CANNOT_REVIEW_OWN_LEAVE' });
    }
    const row = await this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: user.id,
        reviewedAt: new Date(),
        ...(dto.reviewNote !== undefined ? { reviewNote: dto.reviewNote } : {}),
      },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.findOrThrow(id, user);
    // Employees may only cancel their own PENDING request; admins may remove any.
    if (!isHrAdmin(user) && existing.status !== 'PENDING') {
      throw new ForbiddenException({ code: 'ONLY_PENDING_CANCELLABLE' });
    }
    await this.prisma.leaveRequest.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async balance(
    query: LeaveBalanceQueryDto,
    user: AuthenticatedUser,
  ): Promise<LeaveBalanceResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const userId = isHrAdmin(user) ? (query.userId ?? user.id) : user.id;
    const year = query.year ?? new Date().getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
    const approvedPaid = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId: user.tenantId,
        userId,
        deletedAt: null,
        status: 'APPROVED',
        type: 'PAID',
        startDate: { gte: yearStart, lt: yearEnd },
      },
      select: { startDate: true, endDate: true },
    });
    const { takenDays, remainingDays } = computeBalance(approvedPaid);
    return { userId, year, allowanceDays: ANNUAL_LEAVE_ALLOWANCE_DAYS, takenDays, remainingDays };
  }

  private async findOrThrow(id: string, user: AuthenticatedUser): Promise<Row> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!row || (!isHrAdmin(user) && row.userId !== user.id)) {
      throw new NotFoundException({ code: 'LEAVE_REQUEST_NOT_FOUND' });
    }
    return row;
  }

  private toResponse(r: Row): LeaveRequestResponseDto {
    return {
      id: r.id,
      userId: r.userId,
      type: r.type,
      status: r.status,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      days: computeLeaveDays(r.startDate, r.endDate),
      reason: r.reason,
      reviewNote: r.reviewNote,
      reviewedById: r.reviewedById,
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
