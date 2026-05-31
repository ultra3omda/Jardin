import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  CreateSubjectDto,
  ListSubjectsResponseDto,
  SubjectResponseDto,
  UpdateSubjectDto,
} from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubjectDto, user: AuthenticatedUser): Promise<SubjectResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    try {
      const created = await this.prisma.subject.create({
        data: {
          id: createId(),
          tenantId: user.tenantId,
          name: dto.name,
          code: dto.code ?? null,
          emoji: dto.emoji ?? null,
          coefficient: dto.coefficient ?? 1,
          levels: dto.levels ?? [],
        },
      });
      return this.toResponse(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException({ code: 'SUBJECT_ALREADY_EXISTS' });
      }
      throw e;
    }
  }

  async list(user: AuthenticatedUser): Promise<ListSubjectsResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.SubjectWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.subject.findMany({ where, orderBy: { name: 'asc' } }),
      this.prisma.subject.count({ where }),
    ]);
    return { items: items.map((s) => this.toResponse(s)), total };
  }

  async update(id: string, dto: UpdateSubjectDto, user: AuthenticatedUser): Promise<SubjectResponseDto> {
    const existing = await this.prisma.subject.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND' });
    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.coefficient !== undefined ? { coefficient: dto.coefficient } : {}),
        ...(dto.levels !== undefined ? { levels: dto.levels } : {}),
      },
    });
    return this.toResponse(updated);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const existing = await this.prisma.subject.findFirst({
      where: { id, tenantId: user.tenantId ?? undefined, deletedAt: null },
    });
    if (!existing) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND' });
    await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private toResponse(s: {
    id: string;
    name: string;
    code: string | null;
    emoji: string | null;
    coefficient: number;
    levels: string[];
    createdAt: Date;
    updatedAt: Date;
  }): SubjectResponseDto {
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      emoji: s.emoji,
      coefficient: s.coefficient,
      levels: s.levels,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
