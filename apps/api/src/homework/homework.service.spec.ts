/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubmissionStatus, UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { R2Service } from '../common/r2/r2.service';
import { HomeworkService } from './homework.service';

const TENANT = 't1';
const admin: AuthenticatedUser = { id: 'u_admin', email: 'a@s.tn', tenantId: TENANT, role: UserRole.SCHOOL_ADMIN };
const teacher: AuthenticatedUser = { id: 'u_teach', email: 't@s.tn', tenantId: TENANT, role: UserRole.TEACHER };
const parent: AuthenticatedUser = { id: 'u_parent', email: 'p@s.tn', tenantId: TENANT, role: UserRole.PARENT };

function hwRow(over: Record<string, any> = {}) {
  return {
    id: 'hw1',
    tenantId: TENANT,
    classId: 'c1',
    subjectId: 's1',
    createdById: 'u_teach',
    title: 'Exos',
    instructions: 'Faire p.42',
    attachmentUrl: null,
    dueDate: new Date('2026-06-15'),
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    class: { name: 'CP-A' },
    subject: { name: 'Maths' },
    submissions: [],
    ...over,
  };
}

function makePrisma() {
  return {
    class: { findFirst: vi.fn().mockResolvedValue({ id: 'c1' }) },
    classTeacher: { findFirst: vi.fn().mockResolvedValue({ id: 'ct1' }), findMany: vi.fn().mockResolvedValue([{ classId: 'c1' }]) },
    homework: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    homeworkSubmission: { upsert: vi.fn().mockResolvedValue({}) },
    student: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue({ id: 'st1' }) },
    parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('HomeworkService', () => {
  let service: HomeworkService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const r2 = { signedPutUrl: vi.fn().mockResolvedValue('https://r2.put/signed') };
    const config = { get: vi.fn((k: string, d?: unknown) => (k === 'r2.publicUrl' ? 'https://cdn.klasso' : d)) };
    const mod = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: PrismaService, useValue: prisma },
        { provide: R2Service, useValue: r2 },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(HomeworkService);
  });

  it('create: maps response with submission counts', async () => {
    prisma.homework.create.mockResolvedValueOnce(hwRow());
    const res = await service.create(
      { classId: 'c1', title: 'Exos', instructions: 'Faire p.42', dueDate: '2026-06-15' },
      teacher,
    );
    expect(res.className).toBe('CP-A');
    expect(res.submissionCount).toBe(0);
  });

  it('create: forbids a teacher not assigned to the class', async () => {
    prisma.classTeacher.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.create({ classId: 'c1', title: 'x', instructions: 'y', dueDate: '2026-06-15' }, teacher),
    ).rejects.toMatchObject({ response: { code: 'NOT_CLASS_TEACHER' } });
  });

  it('list: a teacher is scoped to their assigned classes', async () => {
    prisma.homework.findMany.mockResolvedValueOnce([hwRow()]);
    await service.list(undefined, teacher);
    const where = prisma.homework.findMany.mock.calls[0][0].where;
    expect(where.classId).toEqual({ in: ['c1'] });
  });

  it('upsertSubmission: SUBMITTED sets submittedAt and returns roster', async () => {
    prisma.homework.findFirst.mockResolvedValueOnce({ id: 'hw1', classId: 'c1' }); // upsert guard
    prisma.homework.findFirst.mockResolvedValueOnce(hwRow({ submissions: [] })); // findById
    prisma.student.findMany.mockResolvedValueOnce([{ id: 'st1', firstName: 'Lina', lastName: 'B' }]);
    const res = await service.upsertSubmission('hw1', { studentId: 'st1', status: SubmissionStatus.SUBMITTED }, teacher);
    expect(prisma.homeworkSubmission.upsert).toHaveBeenCalled();
    const upsertArg = prisma.homeworkSubmission.upsert.mock.calls[0][0];
    expect(upsertArg.update.submittedAt).toBeInstanceOf(Date);
    expect(res.submissions[0].studentName).toBe('Lina B');
  });

  it('myChildren: aggregates homework per child with their status', async () => {
    prisma.parentStudent.findMany.mockResolvedValueOnce([
      { student: { id: 'st1', firstName: 'Lina', lastName: 'B', classId: 'c1' } },
    ]);
    prisma.homework.findMany.mockResolvedValueOnce([
      { id: 'hw1', title: 'Exos', instructions: 'p.42', attachmentUrl: null, dueDate: new Date('2026-06-15'), class: { name: 'CP-A' }, subject: { name: 'Maths' }, submissions: [{ status: SubmissionStatus.SUBMITTED }] },
    ]);
    const res = await service.myChildren(parent);
    expect(res.total).toBe(1);
    expect(res.items[0].status).toBe(SubmissionStatus.SUBMITTED);
    expect(res.items[0].studentName).toBe('Lina B');
  });

  it('getAttachmentUploadUrl: returns a signed url + public finalUrl', async () => {
    const res = await service.getAttachmentUploadUrl('application/pdf', admin);
    expect(res.uploadUrl).toBe('https://r2.put/signed');
    expect(res.finalUrl).toMatch(/^https:\/\/cdn\.klasso\/homework\/t1\/.+\.pdf$/);
  });

  it('getAttachmentUploadUrl: rejects a forbidden content type', async () => {
    await expect(service.getAttachmentUploadUrl('application/zip', admin)).rejects.toMatchObject({
      response: { code: 'ATTACHMENT_CONTENT_TYPE_FORBIDDEN' },
    });
  });
});
