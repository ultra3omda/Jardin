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
  CanteenMenuResponseDto,
  CreateCanteenMenuDto,
  ListCanteenMenusQueryDto,
  ListCanteenMenusResponseDto,
  UpdateCanteenMenuDto,
} from './dto/canteen-menu.dto';

type Row = Prisma.CanteenMenuGetPayload<Record<string, never>>;

@Injectable()
export class CanteenMenusService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListCanteenMenusQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListCanteenMenusResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.CanteenMenuWhereInput = { tenantId: user.tenantId, deletedAt: null };
    if (query.from || query.to) {
      where.date = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    const [rows, total] = await Promise.all([
      this.prisma.canteenMenu.findMany({ where, orderBy: { date: 'desc' }, take: 500 }),
      this.prisma.canteenMenu.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<CanteenMenuResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.canteenMenu.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException({ code: 'CANTEEN_MENU_NOT_FOUND' });
    return this.toResponse(row);
  }

  async create(
    dto: CreateCanteenMenuDto,
    user: AuthenticatedUser,
  ): Promise<CanteenMenuResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    try {
      const row = await this.prisma.canteenMenu.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          date: new Date(dto.date),
          starter: dto.starter ?? null,
          main: dto.main ?? null,
          dessert: dto.dessert ?? null,
          vegetarian: dto.vegetarian ?? null,
        },
      });
      return this.toResponse(row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'CANTEEN_MENU_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async update(
    id: string,
    dto: UpdateCanteenMenuDto,
    user: AuthenticatedUser,
  ): Promise<CanteenMenuResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.canteenMenu.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'CANTEEN_MENU_NOT_FOUND' });
    const row = await this.prisma.canteenMenu.update({
      where: { id },
      data: {
        ...(dto.starter !== undefined ? { starter: dto.starter } : {}),
        ...(dto.main !== undefined ? { main: dto.main } : {}),
        ...(dto.dessert !== undefined ? { dessert: dto.dessert } : {}),
        ...(dto.vegetarian !== undefined ? { vegetarian: dto.vegetarian } : {}),
      },
    });
    return this.toResponse(row);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const existing = await this.prisma.canteenMenu.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'CANTEEN_MENU_NOT_FOUND' });
    await this.prisma.canteenMenu.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(r: Row): CanteenMenuResponseDto {
    return {
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      starter: r.starter,
      main: r.main,
      dessert: r.dessert,
      vegetarian: r.vegetarian,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
