import { describe, expect, it } from 'vitest';
import { deriveDemoRequests, isDemoStatus, isPendingDemo } from './demo-status.util';

const requestedRow = (requestId: string, createdAt: string, extra: Record<string, unknown> = {}) => ({
  action: 'demo.requested',
  metadata: { requestId, email: `${requestId}@x.tn`, schoolName: 'X', studentsCount: 10, locale: 'fr', ...extra },
  createdAt: new Date(createdAt),
});

const statusRow = (requestId: string, status: string, createdAt: string, note?: string) => ({
  action: 'demo.status_changed',
  metadata: { requestId, status, ...(note ? { note } : {}) },
  createdAt: new Date(createdAt),
});

describe('demo-status.util', () => {
  it('isPendingDemo true only for NEW/CONTACTED', () => {
    expect(isPendingDemo('NEW')).toBe(true);
    expect(isPendingDemo('CONTACTED')).toBe(true);
    expect(isPendingDemo('SCHEDULED')).toBe(false);
    expect(isPendingDemo('DONE')).toBe(false);
    expect(isPendingDemo('DECLINED')).toBe(false);
  });

  it('isDemoStatus guards unknown values', () => {
    expect(isDemoStatus('NEW')).toBe(true);
    expect(isDemoStatus('WHATEVER')).toBe(false);
  });

  it('defaults status to NEW when no status row exists', () => {
    const result = deriveDemoRequests([requestedRow('r1', '2026-05-01T10:00:00Z')], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ requestId: 'r1', status: 'NEW', schoolName: 'X', studentsCount: 10 });
  });

  it('applies the latest status row (rows passed DESC)', () => {
    const statusRowsDesc = [
      statusRow('r1', 'SCHEDULED', '2026-05-03T10:00:00Z', 'rendez-vous fixé'),
      statusRow('r1', 'CONTACTED', '2026-05-02T10:00:00Z'),
    ];
    const result = deriveDemoRequests([requestedRow('r1', '2026-05-01T10:00:00Z')], statusRowsDesc);
    expect(result[0].status).toBe('SCHEDULED');
    expect(result[0].note).toBe('rendez-vous fixé');
  });

  it('orders output by receivedAt desc', () => {
    const result = deriveDemoRequests(
      [requestedRow('old', '2026-05-01T10:00:00Z'), requestedRow('new', '2026-05-05T10:00:00Z')],
      [],
    );
    expect(result.map((r) => r.requestId)).toEqual(['new', 'old']);
  });
});
