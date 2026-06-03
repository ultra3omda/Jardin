/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { ClassesService } from './classes.service';

/**
 * V4 — ClassesService unit tests.
 * Covers: CRUD, tenant isolation, teacher assignment, timeslot management.
 *
 * Critical test: tenant B cannot access tenant A's data (NotFoundException).
 */

// ───── Fixtures ─────

function makeClassRow(overrides: Partial<any> = {}) {
  return {
    id: 'cls_1',
    tenantId: 't1',
    name: 'CP-A',
    level: 'CP',
    schoolYear: '2025-2026',
    deletedAt: null,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z'),
    ...overrides,
  };
}

function makeTeacherRow(overrides: Partial<any> = {}) {
  return {
    id: 'u_teach',
    tenantId: 't1',
    email: 'teacher@demo.fr',
    firstName: 'Jean',
    lastName: 'Dupont',
    role: UserRole.TEACHER,
    deletedAt: null,
    ...overrides,
  };
}

function makeClassTeacherRow(overrides: Partial<any> = {}) {
  return {
    id: 'ct_1',
    tenantId: 't1',
    classId: 'cls_1',
    teacherUserId: 'u_teach',
    subject: 'Mathématiques',
    isMainTeacher: false,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    ...overrides,
  };
}

function makeTimeSlotRow(overrides: Partial<any> = {}) {
  return {
    id: 'ts_1',
    tenantId: 't1',
    classId: 'cls_1',
    dayOfWeek: 1,
    periodStart: '08:00',
    periodEnd: '09:00',
    subject: 'Mathématiques',
    teacherUserId: null,
    room: null,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z'),
    ...overrides,
  };
}

// ───── Users ─────

const schoolAdmin: AuthenticatedUser = {
  id: 'u_admin',
  email: 'admin@demo.fr',
  tenantId: 't1',
  role: UserRole.SCHOOL_ADMIN,
};

/** Tenant B admin — must never see tenant A data */
const tenantBAdmin: AuthenticatedUser = {
  id: 'u_admin_b',
  email: 'admin@school-b.fr',
  tenantId: 't2',
  role: UserRole.SCHOOL_ADMIN,
};

// ───── Test suite ─────

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      class: {
        create: vi.fn().mockResolvedValue(makeClassRow()),
        findMany: vi.fn().mockResolvedValue([makeClassRow()]),
        findFirst: vi.fn().mockResolvedValue(makeClassRow()),
        count: vi.fn().mockResolvedValue(1),
        update: vi.fn().mockResolvedValue(makeClassRow()),
      },
      classTeacher: {
        create: vi.fn().mockResolvedValue(makeClassTeacherRow()),
        findFirst: vi.fn().mockResolvedValue(makeClassTeacherRow()),
        delete: vi.fn().mockResolvedValue(makeClassTeacherRow()),
      },
      timeSlot: {
        create: vi.fn().mockResolvedValue(makeTimeSlotRow()),
        findFirst: vi.fn().mockResolvedValue(makeTimeSlotRow()),
        update: vi.fn().mockResolvedValue(makeTimeSlotRow()),
        delete: vi.fn().mockResolvedValue(makeTimeSlotRow()),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue(makeTeacherRow()),
      },
      parentStudent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn((calls: any[]) => Promise.all(calls)),
    };

    const mod = await Test.createTestingModule({
      providers: [ClassesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = mod.get(ClassesService);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a class for the current tenant and returns it', async () => {
      const dto = { name: 'CP-A', level: 'CP', schoolYear: '2025-2026' };
      const result = await service.create(dto, schoolAdmin);

      expect(prisma.class.create).toHaveBeenCalledTimes(1);
      const callArg = prisma.class.create.mock.calls[0][0];
      expect(callArg.data.tenantId).toBe('t1');
      expect(callArg.data.name).toBe('CP-A');
      expect(callArg.data.level).toBe('CP');
      expect(callArg.data.schoolYear).toBe('2025-2026');
      expect(result.id).toBe('cls_1');
      expect(result.name).toBe('CP-A');
    });

    it('throws ForbiddenException when user has no tenantId', async () => {
      const dto = { name: 'CP-A', level: 'CP', schoolYear: '2025-2026' };
      await expect(
        service.create(dto, { ...schoolAdmin, tenantId: null }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.class.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException (CLASS_ALREADY_EXISTS) on P2002 unique constraint', async () => {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.x',
      });
      prisma.class.create.mockRejectedValueOnce(p2002);
      const dto = { name: 'CP-A', level: 'CP', schoolYear: '2025-2026' };
      const err = await service.create(dto, schoolAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({ code: 'CLASS_ALREADY_EXISTS' });
    });

    it('re-throws unknown errors from prisma.class.create', async () => {
      const boom = new Error('DB connection lost');
      prisma.class.create.mockRejectedValueOnce(boom);
      await expect(
        service.create({ name: 'X', level: 'X', schoolYear: '2025-2026' }, schoolAdmin),
      ).rejects.toThrow('DB connection lost');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // list
  // ─────────────────────────────────────────────────────────────────────────
  describe('list', () => {
    it('returns only classes for the current tenant', async () => {
      const result = await service.list(schoolAdmin);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('cls_1');
    });

    it('tenant isolation — tenant B list does NOT contain tenant A classes', async () => {
      // Simulate Prisma returning [] for tenant B (correct isolation)
      prisma.$transaction.mockResolvedValueOnce([[], 0]);
      const result = await service.list(tenantBAdmin);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('filters by schoolYear when provided', async () => {
      prisma.$transaction.mockResolvedValueOnce([[makeClassRow()], 1]);
      const result = await service.list(schoolAdmin, '2025-2026');
      expect(result.total).toBe(1);
    });

    it('throws ForbiddenException when user has no tenantId', async () => {
      await expect(service.list({ ...schoolAdmin, tenantId: null })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('PARENT + mine=true → scopes to the children classes, no teacher filter', async () => {
      prisma.parentStudent.findMany.mockResolvedValueOnce([
        { student: { classId: 'cls_1' } },
        { student: { classId: 'cls_2' } },
        { student: { classId: 'cls_1' } },
      ]);
      const parent: AuthenticatedUser = {
        id: 'u_par', email: 'p@demo.fr', tenantId: 't1', role: UserRole.PARENT,
      };
      await service.list(parent, undefined, true);
      const where = prisma.class.findMany.mock.calls[0][0].where;
      expect(where.id).toEqual({ in: ['cls_1', 'cls_2'] });
      expect(where.teachers).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns the class with teachers and timeslots when found', async () => {
      const classWithRelations = {
        ...makeClassRow(),
        teachers: [makeClassTeacherRow()],
        timeSlots: [makeTimeSlotRow()],
      };
      prisma.class.findFirst.mockResolvedValueOnce(classWithRelations);

      const result = await service.findById('cls_1', schoolAdmin);

      expect(prisma.class.findFirst).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('cls_1');
      expect(result.teachers).toHaveLength(1);
      expect(result.timeSlots).toHaveLength(1);
    });

    it('throws NotFoundException when class does not exist', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      const err = await service.findById('cls_missing', schoolAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).toEqual({ code: 'CLASS_NOT_FOUND' });
    });

    it('TENANT ISOLATION — tenant B cannot read a class belonging to tenant A', async () => {
      // Prisma scopes the query to tenantId = 't2' → nothing found
      prisma.class.findFirst.mockResolvedValueOnce(null);

      const err = await service.findById('cls_1', tenantBAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);

      // Verify tenantId was passed in the where clause
      const callArg = prisma.class.findFirst.mock.calls[0][0];
      expect(callArg.where.tenantId).toBe('t2');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates the class and returns the updated record', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.class.update.mockResolvedValueOnce(makeClassRow({ name: 'CP-B' }));

      const result = await service.update('cls_1', { name: 'CP-B' }, schoolAdmin);

      expect(prisma.class.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.class.update).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('CP-B');
    });

    it('throws NotFoundException when class does not exist', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await expect(service.update('cls_missing', { name: 'X' }, schoolAdmin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('TENANT ISOLATION — tenant B cannot update tenant A class', async () => {
      // Prisma returns null for tenant B's scoped lookup
      prisma.class.findFirst.mockResolvedValueOnce(null);
      const err = await service.update('cls_1', { name: 'Hack' }, tenantBAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('only sends provided fields to prisma.class.update', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.class.update.mockResolvedValueOnce(makeClassRow({ level: 'CE1' }));

      await service.update('cls_1', { level: 'CE1' }, schoolAdmin);
      const updateArg = prisma.class.update.mock.calls[0][0];
      expect(updateArg.data.name).toBeUndefined();
      expect(updateArg.data.level).toBe('CE1');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // remove (soft-delete)
  // ─────────────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('soft-deletes the class by setting deletedAt', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.class.update.mockResolvedValueOnce(makeClassRow({ deletedAt: new Date() }));

      await service.remove('cls_1', schoolAdmin);

      expect(prisma.class.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.class.update).toHaveBeenCalledTimes(1);
      const updateArg = prisma.class.update.mock.calls[0][0];
      expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when class does not exist', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await expect(service.remove('cls_missing', schoolAdmin)).rejects.toThrow(NotFoundException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('TENANT ISOLATION — tenant B cannot delete tenant A class', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      const err = await service.remove('cls_1', tenantBAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.class.update).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // assignTeacher
  // ─────────────────────────────────────────────────────────────────────────
  describe('assignTeacher', () => {
    it('assigns a teacher to a class and returns the assignment', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(makeTeacherRow());
      prisma.classTeacher.create.mockResolvedValueOnce(makeClassTeacherRow());

      const dto = { teacherUserId: 'u_teach', subject: 'Mathématiques', isMainTeacher: false };
      const result = await service.assignTeacher('cls_1', dto, schoolAdmin);

      expect(prisma.classTeacher.create).toHaveBeenCalledTimes(1);
      expect(result.classId).toBe('cls_1');
      expect(result.teacherUserId).toBe('u_teach');
      expect(result.subject).toBe('Mathématiques');
    });

    it('defaults isMainTeacher to false when not provided', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(makeTeacherRow());
      prisma.classTeacher.create.mockResolvedValueOnce(makeClassTeacherRow({ isMainTeacher: false }));

      const dto = { teacherUserId: 'u_teach', subject: 'Français' };
      await service.assignTeacher('cls_1', dto, schoolAdmin);

      const createArg = prisma.classTeacher.create.mock.calls[0][0];
      expect(createArg.data.isMainTeacher).toBe(false);
    });

    it('throws ForbiddenException when user has no tenantId', async () => {
      await expect(
        service.assignTeacher(
          'cls_1',
          { teacherUserId: 'u_teach', subject: 'X' },
          { ...schoolAdmin, tenantId: null },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when class does not exist', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.assignTeacher('cls_missing', { teacherUserId: 'u_teach', subject: 'X' }, schoolAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when teacher user does not exist', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.assignTeacher('cls_1', { teacherUserId: 'u_nobody', subject: 'X' }, schoolAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when user exists but has wrong role', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(makeTeacherRow({ role: UserRole.STAFF }));
      const err = await service
        .assignTeacher('cls_1', { teacherUserId: 'u_staff', subject: 'X' }, schoolAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({ code: 'USER_NOT_TEACHER_ROLE' });
    });

    it('throws BadRequestException (TEACHER_ALREADY_ASSIGNED) on P2002', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(makeTeacherRow());
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.x',
      });
      prisma.classTeacher.create.mockRejectedValueOnce(p2002);

      const err = await service
        .assignTeacher('cls_1', { teacherUserId: 'u_teach', subject: 'X' }, schoolAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({ code: 'TEACHER_ALREADY_ASSIGNED' });
    });

    it('TENANT ISOLATION — tenant B cannot assign teacher to tenant A class', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      const err = await service
        .assignTeacher('cls_1', { teacherUserId: 'u_teach', subject: 'X' }, tenantBAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.classTeacher.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // unassignTeacher
  // ─────────────────────────────────────────────────────────────────────────
  describe('unassignTeacher', () => {
    it('deletes the teacher assignment when found within the tenant', async () => {
      prisma.classTeacher.findFirst.mockResolvedValueOnce(makeClassTeacherRow());

      await service.unassignTeacher('ct_1', schoolAdmin);

      expect(prisma.classTeacher.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.classTeacher.delete).toHaveBeenCalledTimes(1);
      expect(prisma.classTeacher.delete.mock.calls[0][0].where.id).toBe('ct_1');
    });

    it('throws NotFoundException when assignment does not exist', async () => {
      prisma.classTeacher.findFirst.mockResolvedValueOnce(null);
      await expect(service.unassignTeacher('ct_missing', schoolAdmin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.classTeacher.delete).not.toHaveBeenCalled();
    });

    it('TENANT ISOLATION — tenant B cannot remove tenant A teacher assignment', async () => {
      // For tenant B the findFirst returns nothing
      prisma.classTeacher.findFirst.mockResolvedValueOnce(null);
      const err = await service.unassignTeacher('ct_1', tenantBAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.classTeacher.delete).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createTimeSlot
  // ─────────────────────────────────────────────────────────────────────────
  describe('createTimeSlot', () => {
    const validDto = {
      dayOfWeek: 1,
      periodStart: '08:00',
      periodEnd: '09:00',
      subject: 'Mathématiques',
    };

    it('creates a timeslot and returns it', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());

      const result = await service.createTimeSlot('cls_1', validDto, schoolAdmin);

      expect(prisma.timeSlot.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.timeSlot.create.mock.calls[0][0];
      expect(createArg.data.classId).toBe('cls_1');
      expect(createArg.data.tenantId).toBe('t1');
      expect(createArg.data.dayOfWeek).toBe(1);
      expect(result.id).toBe('ts_1');
    });

    it('throws ForbiddenException when user has no tenantId', async () => {
      await expect(
        service.createTimeSlot('cls_1', validDto, { ...schoolAdmin, tenantId: null }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when class does not exist', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createTimeSlot('cls_missing', validDto, schoolAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when periodEnd <= periodStart', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      const invalidDto = { ...validDto, periodStart: '09:00', periodEnd: '08:00' };
      const err = await service
        .createTimeSlot('cls_1', invalidDto, schoolAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({ code: 'INVALID_TIME_RANGE' });
    });

    it('throws BadRequestException when periodEnd equals periodStart', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      const equalDto = { ...validDto, periodStart: '09:00', periodEnd: '09:00' };
      await expect(
        service.createTimeSlot('cls_1', equalDto, schoolAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates teacherUserId when provided — throws NotFoundException for unknown user', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(null);
      const dto = { ...validDto, teacherUserId: 'u_nobody' };
      await expect(service.createTimeSlot('cls_1', dto, schoolAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('validates teacherUserId when provided — throws BadRequest if user is not TEACHER role', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());
      prisma.user.findFirst.mockResolvedValueOnce(makeTeacherRow({ role: UserRole.STAFF }));
      const dto = { ...validDto, teacherUserId: 'u_staff' };
      const err = await service.createTimeSlot('cls_1', dto, schoolAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({ code: 'USER_NOT_TEACHER_ROLE' });
    });

    it('creates timeslot without optional teacherUserId and room', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(makeClassRow());

      await service.createTimeSlot('cls_1', validDto, schoolAdmin);

      const createArg = prisma.timeSlot.create.mock.calls[0][0];
      expect(createArg.data.teacherUserId).toBeNull();
      expect(createArg.data.room).toBeNull();
    });

    it('TENANT ISOLATION — tenant B cannot create timeslot for tenant A class', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      const err = await service
        .createTimeSlot('cls_1', validDto, tenantBAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.timeSlot.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateTimeSlot
  // ─────────────────────────────────────────────────────────────────────────
  describe('updateTimeSlot', () => {
    it('updates the timeslot and returns the updated record', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(makeTimeSlotRow());
      prisma.timeSlot.update.mockResolvedValueOnce(makeTimeSlotRow({ subject: 'Français' }));

      const result = await service.updateTimeSlot('ts_1', { subject: 'Français' }, schoolAdmin);

      expect(prisma.timeSlot.update).toHaveBeenCalledTimes(1);
      expect(result.subject).toBe('Français');
    });

    it('throws NotFoundException when timeslot does not exist', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.updateTimeSlot('ts_missing', { subject: 'X' }, schoolAdmin),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.timeSlot.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when updated time range is invalid', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(
        makeTimeSlotRow({ periodStart: '08:00', periodEnd: '09:00' }),
      );
      // Providing a new periodEnd earlier than existing periodStart
      const err = await service
        .updateTimeSlot('ts_1', { periodEnd: '07:00' }, schoolAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toEqual({ code: 'INVALID_TIME_RANGE' });
    });

    it('allows partial update (only periodEnd, keeping existing periodStart)', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(
        makeTimeSlotRow({ periodStart: '08:00', periodEnd: '09:00' }),
      );
      prisma.timeSlot.update.mockResolvedValueOnce(
        makeTimeSlotRow({ periodStart: '08:00', periodEnd: '10:00' }),
      );

      const result = await service.updateTimeSlot('ts_1', { periodEnd: '10:00' }, schoolAdmin);
      expect(result.periodEnd).toBe('10:00');
    });

    it('only sends provided fields to prisma.timeSlot.update', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(makeTimeSlotRow());
      prisma.timeSlot.update.mockResolvedValueOnce(makeTimeSlotRow({ room: 'Salle 12' }));

      await service.updateTimeSlot('ts_1', { room: 'Salle 12' }, schoolAdmin);

      const updateArg = prisma.timeSlot.update.mock.calls[0][0];
      expect(updateArg.data.room).toBe('Salle 12');
      expect(updateArg.data.subject).toBeUndefined();
      expect(updateArg.data.dayOfWeek).toBeUndefined();
    });

    it('TENANT ISOLATION — tenant B cannot update tenant A timeslot', async () => {
      // Prisma scoped to tenantId = 't2' → not found
      prisma.timeSlot.findFirst.mockResolvedValueOnce(null);
      const err = await service
        .updateTimeSlot('ts_1', { subject: 'Hack' }, tenantBAdmin)
        .catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.timeSlot.update).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteTimeSlot
  // ─────────────────────────────────────────────────────────────────────────
  describe('deleteTimeSlot', () => {
    it('deletes the timeslot when found within the tenant', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(makeTimeSlotRow());

      await service.deleteTimeSlot('ts_1', schoolAdmin);

      expect(prisma.timeSlot.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.timeSlot.delete).toHaveBeenCalledTimes(1);
      expect(prisma.timeSlot.delete.mock.calls[0][0].where.id).toBe('ts_1');
    });

    it('throws NotFoundException when timeslot does not exist', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(null);
      await expect(service.deleteTimeSlot('ts_missing', schoolAdmin)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.timeSlot.delete).not.toHaveBeenCalled();
    });

    it('TENANT ISOLATION — tenant B cannot delete tenant A timeslot', async () => {
      prisma.timeSlot.findFirst.mockResolvedValueOnce(null);
      const err = await service.deleteTimeSlot('ts_1', tenantBAdmin).catch((e: any) => e);
      expect(err).toBeInstanceOf(NotFoundException);
      expect(prisma.timeSlot.delete).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TENANT ISOLATION — consolidated where-clause assertions
  // ─────────────────────────────────────────────────────────────────────────
  describe('TENANT ISOLATION (where-clause forwarding)', () => {
    it('findById: tenantId is always forwarded in the where clause', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await service.findById('cls_1', tenantBAdmin).catch(() => {});
      const callArg = prisma.class.findFirst.mock.calls[0][0];
      expect(callArg.where.tenantId).toBe('t2');
    });

    it('update: tenantId is always forwarded in the findFirst where clause', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await service.update('cls_1', { name: 'X' }, tenantBAdmin).catch(() => {});
      const callArg = prisma.class.findFirst.mock.calls[0][0];
      expect(callArg.where.tenantId).toBe('t2');
    });

    it('remove: tenantId is always forwarded in the findFirst where clause', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await service.remove('cls_1', tenantBAdmin).catch(() => {});
      const callArg = prisma.class.findFirst.mock.calls[0][0];
      expect(callArg.where.tenantId).toBe('t2');
    });

    it('assignTeacher: tenantId is used to scope the class lookup', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await service
        .assignTeacher('cls_1', { teacherUserId: 'u', subject: 'X' }, tenantBAdmin)
        .catch(() => {});
      const classLookupArg = prisma.class.findFirst.mock.calls[0][0];
      expect(classLookupArg.where.tenantId).toBe('t2');
    });

    it('createTimeSlot: tenantId is used to scope the class lookup', async () => {
      prisma.class.findFirst.mockResolvedValueOnce(null);
      await service
        .createTimeSlot(
          'cls_1',
          { dayOfWeek: 1, periodStart: '08:00', periodEnd: '09:00', subject: 'X' },
          tenantBAdmin,
        )
        .catch(() => {});
      const callArg = prisma.class.findFirst.mock.calls[0][0];
      expect(callArg.where.tenantId).toBe('t2');
    });
  });
});
