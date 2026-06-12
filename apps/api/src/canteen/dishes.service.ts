import { Injectable, NotFoundException } from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';

import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDishDto, UpdateDishDto } from './dto/canteen-extra.dto';

/** G4 — Catalogue de plats (PlatsCantine / Ingrediants). */
@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.dish.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  create(tenantId: string, dto: CreateDishDto) {
    return this.prisma.dish.create({
      data: {
        id: createId(),
        tenantId,
        name: dto.name,
        ingredients: dto.ingredients ?? [],
        allergens: dto.allergens ?? [],
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDishDto) {
    const d = await this.prisma.dish.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!d) throw new NotFoundException('Dish not found');
    return this.prisma.dish.update({ where: { id }, data: { ...dto } });
  }

  async remove(tenantId: string, id: string) {
    const d = await this.prisma.dish.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!d) throw new NotFoundException('Dish not found');
    await this.prisma.dish.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
