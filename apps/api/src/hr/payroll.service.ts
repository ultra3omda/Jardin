import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  AddPayslipComponentDto,
  GeneratePayslipDto,
  ListPayslipsQueryDto,
  ListPayslipsResponseDto,
  PayslipResponseDto,
} from './dto/payslip.dto';

type PayslipRow = Prisma.PayslipGetPayload<{ include: { components: true } }>;
type ComponentInput = { kind: 'EARNING' | 'DEDUCTION'; amount: Prisma.Decimal };

/**
 * Pure MVP payroll calc: gross = base + Σ earnings, net = gross − Σ deductions.
 * No tax engine (CNSS/IRPP) — explicitly out of scope.
 */
export function computePayslipTotals(
  baseSalary: Prisma.Decimal,
  components: ReadonlyArray<ComponentInput>,
): { grossSalary: Prisma.Decimal; totalDeductions: Prisma.Decimal; netSalary: Prisma.Decimal } {
  const earnings = components
    .filter((c) => c.kind === 'EARNING')
    .reduce((sum, c) => sum.add(c.amount), new Prisma.Decimal(0));
  const totalDeductions = components
    .filter((c) => c.kind === 'DEDUCTION')
    .reduce((sum, c) => sum.add(c.amount), new Prisma.Decimal(0));
  const grossSalary = baseSalary.add(earnings);
  return { grossSalary, totalDeductions, netSalary: grossSalary.sub(totalDeductions) };
}

function isHrAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.SCHOOL_ADMIN || user.role === UserRole.SUPER_ADMIN;
}

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListPayslipsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListPayslipsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.PayslipWhereInput = { tenantId: user.tenantId, deletedAt: null };
    where.userId = isHrAdmin(user) ? query.userId : user.id;
    if (query.period) where.period = query.period;
    const [rows, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where,
        include: { components: true },
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
        take: 500,
      }),
      this.prisma.payslip.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<PayslipResponseDto> {
    return this.toResponse(await this.findOrThrow(id, user));
  }

  async generate(dto: GeneratePayslipDto, user: AuthenticatedUser): Promise<PayslipResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    this.assertAdmin(user);

    const contract = await this.prisma.employmentContract.findFirst({
      where: { tenantId: user.tenantId, userId: dto.userId, status: 'ACTIVE', deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
    if (!contract) throw new BadRequestException({ code: 'NO_ACTIVE_CONTRACT' });

    const duplicate = await this.prisma.payslip.findFirst({
      where: { tenantId: user.tenantId, userId: dto.userId, period: dto.period, deletedAt: null },
    });
    if (duplicate) throw new ConflictException({ code: 'PAYSLIP_PERIOD_EXISTS' });

    // No components at generation → gross = net = base, deductions = 0.
    const totals = computePayslipTotals(contract.baseSalary, []);
    const row = await this.prisma.payslip.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        userId: dto.userId,
        period: dto.period,
        baseSalary: contract.baseSalary,
        grossSalary: totals.grossSalary,
        totalDeductions: totals.totalDeductions,
        netSalary: totals.netSalary,
        currency: contract.currency,
        notes: dto.notes ?? null,
      },
      include: { components: true },
    });
    return this.toResponse(row);
  }

  async addComponent(
    id: string,
    dto: AddPayslipComponentDto,
    user: AuthenticatedUser,
  ): Promise<PayslipResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    this.assertAdmin(user);
    const payslip = await this.findOrThrow(id, user);
    this.assertDraft(payslip);
    await this.prisma.payslipComponent.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        payslipId: payslip.id,
        label: dto.label.trim(),
        kind: dto.kind,
        amount: new Prisma.Decimal(dto.amount),
      },
    });
    return this.recalculateAndReturn(payslip.id, user);
  }

  async removeComponent(
    id: string,
    componentId: string,
    user: AuthenticatedUser,
  ): Promise<PayslipResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    this.assertAdmin(user);
    const payslip = await this.findOrThrow(id, user);
    this.assertDraft(payslip);
    const component = await this.prisma.payslipComponent.findFirst({
      where: { id: componentId, payslipId: payslip.id, tenantId: user.tenantId },
    });
    if (!component) throw new NotFoundException({ code: 'PAYSLIP_COMPONENT_NOT_FOUND' });
    await this.prisma.payslipComponent.delete({ where: { id: componentId } });
    return this.recalculateAndReturn(payslip.id, user);
  }

  async issue(id: string, user: AuthenticatedUser): Promise<PayslipResponseDto> {
    this.assertAdmin(user);
    const payslip = await this.findOrThrow(id, user);
    if (payslip.status === 'ISSUED') throw new BadRequestException({ code: 'ALREADY_ISSUED' });
    const row = await this.prisma.payslip.update({
      where: { id: payslip.id },
      data: { status: 'ISSUED', issuedAt: new Date() },
      include: { components: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    this.assertAdmin(user);
    const payslip = await this.findOrThrow(id, user);
    await this.prisma.payslip.update({ where: { id: payslip.id }, data: { deletedAt: new Date() } });
  }

  private async recalculateAndReturn(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PayslipResponseDto> {
    const payslip = await this.findOrThrow(id, user);
    const totals = computePayslipTotals(
      payslip.baseSalary,
      payslip.components.map((c) => ({ kind: c.kind, amount: c.amount })),
    );
    const row = await this.prisma.payslip.update({
      where: { id },
      data: {
        grossSalary: totals.grossSalary,
        totalDeductions: totals.totalDeductions,
        netSalary: totals.netSalary,
      },
      include: { components: true },
    });
    return this.toResponse(row);
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (!isHrAdmin(user)) throw new ForbiddenException({ code: 'HR_ADMIN_REQUIRED' });
  }

  private assertDraft(payslip: PayslipRow): void {
    if (payslip.status !== 'DRAFT') {
      throw new BadRequestException({ code: 'PAYSLIP_NOT_EDITABLE' });
    }
  }

  private async findOrThrow(id: string, user: AuthenticatedUser): Promise<PayslipRow> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.payslip.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { components: true },
    });
    if (!row || (!isHrAdmin(user) && row.userId !== user.id)) {
      throw new NotFoundException({ code: 'PAYSLIP_NOT_FOUND' });
    }
    return row;
  }

  private toResponse(r: PayslipRow): PayslipResponseDto {
    return {
      id: r.id,
      userId: r.userId,
      period: r.period,
      baseSalary: r.baseSalary.toString(),
      grossSalary: r.grossSalary.toString(),
      totalDeductions: r.totalDeductions.toString(),
      netSalary: r.netSalary.toString(),
      currency: r.currency,
      status: r.status,
      issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
      notes: r.notes,
      components: r.components
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((c) => ({ id: c.id, label: c.label, kind: c.kind, amount: c.amount.toString() })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
