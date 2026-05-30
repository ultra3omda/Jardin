import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlatformAnalyticsService } from './platform-analytics.service';

function buildPrisma() {
  return {
    tenant: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
    student: { count: vi.fn() },
    auditLog: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

describe('PlatformAnalyticsService', () => {
  let service: PlatformAnalyticsService;
  let prisma: ReturnType<typeof buildPrisma>;

  beforeEach(async () => {
    prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [PlatformAnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(PlatformAnalyticsService);
  });

  it('overview returns counts and pending demo requests', async () => {
    prisma.tenant.count.mockResolvedValue(3);
    prisma.user.count.mockResolvedValue(12);
    prisma.student.count.mockResolvedValue(40);
    prisma.auditLog.findMany
      .mockResolvedValueOnce([
        { action: 'demo.requested', metadata: { requestId: 'r1', email: 'a@x.tn', schoolName: 'X' }, createdAt: new Date('2026-05-01T10:00:00Z') },
      ])
      .mockResolvedValueOnce([]);
    const result = await service.overview();
    expect(result).toEqual({ tenants: 3, users: 12, students: 40, pendingDemoRequests: 1 });
  });

  it('analytics builds cumulative monthly growth and distributions', async () => {
    prisma.tenant.findMany.mockResolvedValue([
      { createdAt: new Date('2026-03-10T00:00:00Z'), type: 'PRIMARY_SCHOOL', locale: 'fr' },
      { createdAt: new Date('2026-03-20T00:00:00Z'), type: 'KINDERGARTEN', locale: 'fr' },
      { createdAt: new Date('2026-04-05T00:00:00Z'), type: 'PRIMARY_SCHOOL', locale: 'ar' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { role: 'SCHOOL_ADMIN' },
      { role: 'TEACHER' },
      { role: 'TEACHER' },
    ]);
    const result = await service.analytics();
    expect(result.tenantGrowth).toEqual([
      { month: '2026-03', newTenants: 2, cumulativeTenants: 2 },
      { month: '2026-04', newTenants: 1, cumulativeTenants: 3 },
    ]);
    expect(result.tenantsByType).toEqual(
      expect.arrayContaining([
        { label: 'PRIMARY_SCHOOL', count: 2 },
        { label: 'KINDERGARTEN', count: 1 },
      ]),
    );
    expect(result.tenantsByLocale).toEqual(
      expect.arrayContaining([
        { label: 'fr', count: 2 },
        { label: 'ar', count: 1 },
      ]),
    );
    expect(result.usersByRole).toEqual(
      expect.arrayContaining([
        { label: 'TEACHER', count: 2 },
        { label: 'SCHOOL_ADMIN', count: 1 },
      ]),
    );
  });
});
