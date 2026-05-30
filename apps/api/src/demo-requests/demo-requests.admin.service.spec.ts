import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { DemoRequestsService } from './demo-requests.service';

const meta = { ip: '127.0.0.1', userAgent: 'vitest' };

function buildPrisma() {
  return {
    auditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('DemoRequestsService (admin)', () => {
  let service: DemoRequestsService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        DemoRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResendService, useValue: { send: vi.fn() } },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();
    service = moduleRef.get(DemoRequestsService);
  });

  it('listForAdmin derives records from requested + status rows', async () => {
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          action: 'demo.requested',
          metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X', studentsCount: 12, locale: 'fr' },
          createdAt: new Date('2026-05-01T10:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        { action: 'demo.status_changed', metadata: { requestId: 'r1', status: 'CONTACTED' }, createdAt: new Date('2026-05-02T10:00:00Z') },
      ]);
    const result = await service.listForAdmin();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ requestId: 'r1', status: 'CONTACTED' });
  });

  it('updateStatus throws NotFound when the request does not exist', async () => {
    prisma.auditLog.findFirst.mockResolvedValueOnce(null);
    await expect(service.updateStatus('super-1', 'missing', { status: 'DONE' }, meta)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('updateStatus writes a demo.status_changed row and returns the recomputed record', async () => {
    prisma.auditLog.findFirst.mockResolvedValueOnce({
      action: 'demo.requested',
      metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X', studentsCount: 12, locale: 'fr' },
      createdAt: new Date('2026-05-01T10:00:00Z'),
    });
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        {
          action: 'demo.requested',
          metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X', studentsCount: 12, locale: 'fr' },
          createdAt: new Date('2026-05-01T10:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        { action: 'demo.status_changed', metadata: { requestId: 'r1', status: 'SCHEDULED', note: 'ok' }, createdAt: new Date('2026-05-03T10:00:00Z') },
      ]);
    const result = await service.updateStatus('super-1', 'r1', { status: 'SCHEDULED', note: 'ok' }, meta);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'demo.status_changed', userId: 'super-1' }),
      }),
    );
    expect(result).toMatchObject({ requestId: 'r1', status: 'SCHEDULED', note: 'ok' });
  });
});
