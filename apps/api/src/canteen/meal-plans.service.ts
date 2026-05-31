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
  CreateMealPlanDto,
  ListMealPlansQueryDto,
  ListMealPlansResponseDto,
  MealPlanResponseDto,
  UpdateMealPlanDto,
} from './dto/meal-plan.dto';

type Row = Prisma.MealPlanGetPayload<{ include: { student: true } }>;

@Injectable()
export class MealPlansService {
  constructor(private readonly prisma: PrismaService) {}

  private async parentStudentIds(tenantId: string, parentUserId: string): Promise<string[]> {
    const rows = await this.prisma.parentStudent.findMany({
      where: { tenantId, parentUserId },
      select: { studentId: true },
    });
    return rows.map((r) => r.studentId);
  }

  async list(
    query: ListMealPlansQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListMealPlansResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.MealPlanWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.studentId) where.studentId = query.studentId;
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      where.studentId =
        query.studentId && ids.includes(query.studentId) ? query.studentId : { in: ids };
    }
    const [rows, total] = await Promise.all([
      this.prisma.mealPlan.findMany({
        where,
        include: { student: true },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
      this.prisma.mealPlan.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<MealPlanResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.mealPlan.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { student: true },
    });
    if (!row) throw new NotFoundException({ code: 'MEAL_PLAN_NOT_FOUND' });
    if (user.role === 'PARENT') {
      const ids = await this.parentStudentIds(user.tenantId, user.id);
      if (!ids.includes(row.studentId)) {
        throw new ForbiddenException({ code: 'STUDENT_NOT_OWNED_BY_PARENT' });
      }
    }
    return this.toResponse(row);
  }

  async create(dto: CreateMealPlanDto, user: AuthenticatedUser): Promise<MealPlanResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND' });
    try {
      const row = await this.prisma.mealPlan.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          studentId: dto.studentId,
          regime: dto.regime ?? 'STANDARD',
          allergies: dto.allergies ?? null,
          active: dto.active ?? true,
          notes: dto.notes ?? null,
        },
        include: { student: true },
      });
      return this.toResponse(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'MEAL_PLAN_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateMealPlanDto,
    user: AuthenticatedUser,
  ): Promise<MealPlanResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.mealPlan.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'MEAL_PLAN_NOT_FOUND' });
    const row = await this.prisma.mealPlan.update({
      where: { id },
      data: {
        ...(dto.regime !== undefined ? { regime: dto.regime } : {}),
        ...(dto.allergies !== undefined ? { allergies: dto.allergies } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: { student: true },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.mealPlan.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'MEAL_PLAN_NOT_FOUND' });
    await this.prisma.mealPlan.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(r: Row): MealPlanResponseDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      regime: r.regime,
      allergies: r.allergies,
      active: r.active,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
