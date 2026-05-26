/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RelationType, UserRole, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { ParentRelationsService } from './parent-relations.service';

const schoolAdmin: AuthenticatedUser = {
  id: 'u_admin',
  email: 'admin@demo.tn',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};
const parent: AuthenticatedUser = {
  id: 'u_parent_self',
  email: 'parent@demo.tn',
  tenantId: 't1',
  role: UserRole.PARENT,
};

function makePrismaMock() {
  return {
    user: { findFirst: vi.fn() },
    student: { findFirst: vi.fn() },
    parentStudent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  } as any;
}

describe('ParentRelationsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: ParentRelationsService;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const mod = await Test.createTestingModule({
      providers: [
        ParentRelationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(ParentRelationsService);
  });

  describe('create', () => {
    it('rejects when user has no tenant', async () => {
      await expect(
        service.create(
          { parentUserId: 'p', studentId: 's', relationType: RelationType.FATHER },
          { ...schoolAdmin, tenantId: null },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when parent user does not exist in tenant', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { parentUserId: 'p_x', studentId: 's', relationType: RelationType.FATHER },
          schoolAdmin,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when parent user does not have PARENT role', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'p_x', role: UserRole.TEACHER });
      await expect(
        service.create(
          { parentUserId: 'p_x', studentId: 's', relationType: RelationType.FATHER },
          schoolAdmin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when student does not exist in tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'p_x', role: UserRole.PARENT });
      prisma.student.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          { parentUserId: 'p_x', studentId: 's_y', relationType: RelationType.MOTHER },
          schoolAdmin,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a link on happy path', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'p_x', role: UserRole.PARENT });
      prisma.student.findFirst.mockResolvedValue({ id: 's_y' });
      prisma.parentStudent.create.mockResolvedValue({
        id: 'rel_1',
        parentUserId: 'p_x',
        studentId: 's_y',
        relationType: RelationType.MOTHER,
        isPrimaryContact: true,
        createdAt: new Date('2026-05-26T17:00:00Z'),
      });
      const out = await service.create(
        {
          parentUserId: 'p_x',
          studentId: 's_y',
          relationType: RelationType.MOTHER,
          isPrimaryContact: true,
        },
        schoolAdmin,
      );
      expect(out.id).toBe('rel_1');
      expect(out.relationType).toBe(RelationType.MOTHER);
      expect(out.isPrimaryContact).toBe(true);
    });

    it('maps Prisma P2002 to BadRequest PARENT_STUDENT_LINK_ALREADY_EXISTS', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'p_x', role: UserRole.PARENT });
      prisma.student.findFirst.mockResolvedValue({ id: 's_y' });
      prisma.parentStudent.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5',
        }),
      );
      await expect(
        service.create(
          { parentUserId: 'p_x', studentId: 's_y', relationType: RelationType.FATHER },
          schoolAdmin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('rejects when neither studentId nor parentUserId is provided', async () => {
      await expect(service.list({}, schoolAdmin)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forces PARENT role to filter on self', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.list({ parentUserId: 'u_parent_self' }, parent);
      expect(prisma.parentStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ parentUserId: 'u_parent_self' }),
        }),
      );
    });

    it('rejects PARENT trying to filter on a different parentUserId', async () => {
      await expect(
        service.list({ parentUserId: 'someone_else' }, parent),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('rejects when relation does not exist', async () => {
      prisma.parentStudent.findFirst.mockResolvedValue(null);
      await expect(service.remove('rel_x', schoolAdmin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes when relation exists', async () => {
      prisma.parentStudent.findFirst.mockResolvedValue({ id: 'rel_1' });
      prisma.parentStudent.delete.mockResolvedValue(undefined);
      await service.remove('rel_1', schoolAdmin);
      expect(prisma.parentStudent.delete).toHaveBeenCalledWith({ where: { id: 'rel_1' } });
    });
  });
});
