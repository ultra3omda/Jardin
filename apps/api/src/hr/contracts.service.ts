import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateEmploymentContractDto,
  EmploymentContractResponseDto,
  ListContractsQueryDto,
  ListContractsResponseDto,
  UpdateEmploymentContractDto,
} from './dto/employment-contract.dto';

type Row = Prisma.EmploymentContractGetPayload<Record<string, never>>;

/** SCHOOL_ADMIN / SUPER_ADMIN manage all contracts; employees read only their own. */
function isHrAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.SCHOOL_ADMIN || user.role === UserRole.SUPER_ADMIN;
}

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListContractsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListContractsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.EmploymentContractWhereInput = { tenantId: user.tenantId, deletedAt: null };
    // Non-admins are confined to their own contracts regardless of the query.
    where.userId = isHrAdmin(user) ? query.userId : user.id;
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.prisma.employmentContract.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.employmentContract.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<EmploymentContractResponseDto> {
    return this.toResponse(await this.findOrThrow(id, user));
  }

  async create(
    dto: CreateEmploymentContractDto,
    user: AuthenticatedUser,
  ): Promise<EmploymentContractResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    this.assertAdmin(user);
    // Guard: the employee must belong to the same tenant (and be an employee role).
    const employee = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        tenantId: user.tenantId,
        role: { in: [UserRole.TEACHER, UserRole.STAFF] },
        deletedAt: null,
      },
    });
    if (!employee) throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND' });
    const row = await this.prisma.employmentContract.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: dto.userId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        baseSalary: new Prisma.Decimal(dto.baseSalary),
        weeklyHours: dto.weeklyHours ?? null,
        notes: dto.notes ?? null,
      },
    });
    return this.toResponse(row);
  }

  async update(
    id: string,
    dto: UpdateEmploymentContractDto,
    user: AuthenticatedUser,
  ): Promise<EmploymentContractResponseDto> {
    this.assertAdmin(user);
    await this.findOrThrow(id, user);
    const row = await this.prisma.employmentContract.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.baseSalary !== undefined
          ? { baseSalary: new Prisma.Decimal(dto.baseSalary) }
          : {}),
        ...(dto.weeklyHours !== undefined ? { weeklyHours: dto.weeklyHours } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return this.toResponse(row);
  }

  async end(id: string, user: AuthenticatedUser): Promise<EmploymentContractResponseDto> {
    this.assertAdmin(user);
    const existing = await this.findOrThrow(id, user);
    const row = await this.prisma.employmentContract.update({
      where: { id },
      data: {
        status: 'ENDED',
        endDate: existing.endDate ?? new Date(),
      },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    this.assertAdmin(user);
    await this.findOrThrow(id, user);
    await this.prisma.employmentContract.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (!isHrAdmin(user)) throw new ForbiddenException({ code: 'HR_ADMIN_REQUIRED' });
  }

  private async findOrThrow(id: string, user: AuthenticatedUser): Promise<Row> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.employmentContract.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    // Employees may only access their own contracts.
    if (!row || (!isHrAdmin(user) && row.userId !== user.id)) {
      throw new NotFoundException({ code: 'CONTRACT_NOT_FOUND' });
    }
    return row;
  }

  private toResponse(r: Row): EmploymentContractResponseDto {
    return {
      id: r.id,
      userId: r.userId,
      type: r.type,
      status: r.status,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate ? r.endDate.toISOString() : null,
      baseSalary: r.baseSalary.toString(),
      currency: r.currency,
      weeklyHours: r.weeklyHours,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
