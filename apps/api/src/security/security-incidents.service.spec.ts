import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import type { PrismaService } from '../common/prisma/prisma.service';
import { SecurityIncidentsService } from './security-incidents.service';

const staff: AuthenticatedUser = { id: 'u1', email: 'a@t.test', tenantId: 't1', role: UserRole.STAFF };

const incidentRow = {
  id: 'i1',
  type: 'INTRUSION',
  severity: 'MEDIUM',
  location: null,
  occurredAt: new Date('2026-05-30T10:30:00.000Z'),
  description: 'x',
  status: 'OPEN',
  resolutionNote: null,
  resolvedAt: null,
  reportedById: 'u1',
  resolvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma() {
  return {
    securityIncident: {
      create: vi.fn().mockResolvedValue(incidentRow),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('SecurityIncidentsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: SecurityIncidentsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SecurityIncidentsService(prisma as unknown as PrismaService);
  });

  it('create throws TENANT_REQUIRED without a tenant', async () => {
    await expect(
      service.create(
        { type: 'INTRUSION', occurredAt: '2026-05-30T10:30:00.000Z', description: 'x' },
        { ...staff, tenantId: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list scopes to the tenant', async () => {
    await service.list({}, staff);
    const arg = prisma.securityIncident.findMany.mock.calls[0]![0] as {
      where: { tenantId: string };
    };
    expect(arg.where.tenantId).toBe('t1');
  });

  it('resolve marks the incident RESOLVED with resolver metadata', async () => {
    prisma.securityIncident.findFirst.mockResolvedValueOnce({ id: 'i1' });
    prisma.securityIncident.update.mockResolvedValueOnce({
      ...incidentRow,
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedById: 'u1',
    });
    const res = await service.resolve('i1', { resolutionNote: 'ok' }, staff);
    expect(res.status).toBe('RESOLVED');
    const arg = prisma.securityIncident.update.mock.calls[0]![0] as {
      data: { status: string; resolvedById: string };
    };
    expect(arg.data.status).toBe('RESOLVED');
    expect(arg.data.resolvedById).toBe('u1');
  });

  it('getById of a missing incident throws NotFound', async () => {
    prisma.securityIncident.findFirst.mockResolvedValueOnce(null);
    await expect(service.getById('x', staff)).rejects.toBeInstanceOf(NotFoundException);
  });
});
