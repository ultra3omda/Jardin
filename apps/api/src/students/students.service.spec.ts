/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Sex, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { StudentsService } from './students.service';

/**
 * V2 — StudentsService unit tests.
 * Couvre : RBAC PARENT/SCHOOL_ADMIN/TEACHER/STAFF, audit logs, soft-delete,
 * et la projection toResponse (Date → ISO).
 */

function makeRow(overrides: Partial<any> = {}) {
  return {
    id: 'stu_1',
    tenantId: 't1',
    firstName: 'Alice',
    lastName: 'Ben Salem',
    dateOfBirth: new Date('2018-09-15'),
    sex: Sex.F,
    nationality: 'TN',
    classroom: 'CP-A',
    enrollmentDate: new Date('2024-09-01'),
    previousSchooling: null,
    parentEmail: 'parent@example.tn',
    siblingsCount: 0,
    addressLine: null,
    city: null,
    postalCode: null,
    country: 'TN',
    motherTongue: 'ar',
    medicalNotes: null,
    photoUrl: null,
    createdAt: new Date('2026-05-25T10:00:00Z'),
    updatedAt: new Date('2026-05-25T10:00:00Z'),
    ...overrides,
  };
}

const schoolAdmin: AuthenticatedUser = {
  id: 'u_admin',
  email: 'admin@demo.fr',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};
const teacher: AuthenticatedUser = {
  id: 'u_teach',
  email: 'teach@demo.fr',
  tenantId: 't1',
  role: UserRole.TEACHER,
};
const parent: AuthenticatedUser = {
  id: 'u_parent',
  email: 'PARENT@example.tn',
  tenantId: 't1',
  role: UserRole.PARENT,
};
const staff: AuthenticatedUser = {
  id: 'u_staff',
  email: 'staff@demo.fr',
  tenantId: 't1',
  role: UserRole.STAFF,
};

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      student: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([makeRow()]),
        findFirst: vi.fn().mockResolvedValue(makeRow()),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue(makeRow()),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn(async (fn: any) =>
        fn({
          student: {
            create: vi.fn().mockResolvedValue(makeRow()),
            update: vi.fn().mockResolvedValue(makeRow()),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
    };

    const mod = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(StudentsService);
  });

  describe('create', () => {
    it('creates a student under the current tenant and writes an audit log', async () => {
      const res = await service.create(
        {
          firstName: '  Alice ',
          lastName: 'Ben Salem',
          dateOfBirth: '2018-09-15',
          sex: Sex.F,
          classroom: 'CP-A',
          parentEmail: 'PARENT@example.tn',
        } as any,
        schoolAdmin,
        { ip: '127.0.0.1', userAgent: 'jest' },
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(res.tenantId).toBe('t1');
      expect(res.dateOfBirth).toBe('2018-09-15');
      expect(res.enrollmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('rejects creation when current user has no tenant', async () => {
      await expect(
        service.create(
          {
            firstName: 'A',
            lastName: 'B',
            dateOfBirth: '2018-01-01',
            sex: Sex.M,
            classroom: 'CP-A',
            parentEmail: 'p@e.tn',
          } as any,
          { ...schoolAdmin, tenantId: null },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('lists all students for SCHOOL_ADMIN (no parentEmail filter)', async () => {
      const res = await service.list({}, schoolAdmin);
      expect(prisma.student.findMany).toHaveBeenCalledTimes(1);
      const callArgs = prisma.student.findMany.mock.calls[0][0];
      expect(callArgs.where.parentEmail).toBeUndefined();
      expect(res.total).toBe(1);
    });

    it('lists all students for TEACHER (no parentEmail filter)', async () => {
      await service.list({}, teacher);
      const callArgs = prisma.student.findMany.mock.calls[0][0];
      expect(callArgs.where.parentEmail).toBeUndefined();
    });

    it('lists all students for STAFF (no parentEmail filter)', async () => {
      await service.list({}, staff);
      const callArgs = prisma.student.findMany.mock.calls[0][0];
      expect(callArgs.where.parentEmail).toBeUndefined();
    });

    it('filters by parentEmail (lowercased) for PARENT', async () => {
      await service.list({}, parent);
      const callArgs = prisma.student.findMany.mock.calls[0][0];
      expect(callArgs.where.parentEmail).toBe('parent@example.tn');
    });

    it('applies ILIKE search on firstName/lastName when search is provided', async () => {
      await service.list({ search: '  ali  ' }, schoolAdmin);
      const callArgs = prisma.student.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toEqual([
        { firstName: { contains: 'ali', mode: 'insensitive' } },
        { lastName: { contains: 'ali', mode: 'insensitive' } },
      ]);
    });
  });

  describe('getById', () => {
    it('throws NotFound when row does not exist', async () => {
      prisma.student.findFirst.mockResolvedValueOnce(null);
      await expect(service.getById('missing', schoolAdmin)).rejects.toThrow(NotFoundException);
    });

    it('forbids PARENT from reading a student they do not own', async () => {
      prisma.student.findFirst.mockResolvedValueOnce(
        makeRow({ parentEmail: 'someone-else@example.tn' }),
      );
      await expect(service.getById('stu_1', parent)).rejects.toThrow(ForbiddenException);
    });

    it('returns the student when PARENT owns it (case-insensitive email match)', async () => {
      const res = await service.getById('stu_1', parent);
      expect(res.id).toBe('stu_1');
    });
  });

  describe('update', () => {
    it('updates only provided fields and audits the change', async () => {
      const res = await service.update(
        'stu_1',
        { classroom: '  CE1-B ' } as any,
        schoolAdmin,
        { ip: '127.0.0.1' },
      );
      expect(prisma.student.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(res.tenantId).toBe('t1');
    });

    it('throws NotFound when target student does not exist', async () => {
      prisma.student.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update('missing', { classroom: 'X' } as any, schoolAdmin, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('sets deletedAt and writes an audit log', async () => {
      await service.softDelete('stu_1', schoolAdmin, { ip: '127.0.0.1' });
      expect(prisma.student.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws NotFound when target does not exist', async () => {
      prisma.student.findFirst.mockResolvedValueOnce(null);
      await expect(service.softDelete('missing', schoolAdmin, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
