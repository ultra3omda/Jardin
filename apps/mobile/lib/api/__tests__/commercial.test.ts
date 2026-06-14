import { summarizePipeline, type OrganizationSummary } from '../commercial';

const org = (over: Partial<OrganizationSummary>): OrganizationSummary => ({
  id: 'o',
  name: 'Org',
  slug: 'org',
  type: 'PRIMARY_SCHOOL',
  locale: 'fr',
  status: 'PENDING_ONBOARDING',
  onboardingCompleted: false,
  createdAt: '2026-06-01T00:00:00.000Z',
  inviteStatus: 'pending',
  contractsCount: 0,
  ...over,
});

describe('summarizePipeline', () => {
  it('returns all zeros for an empty list', () => {
    expect(summarizePipeline([])).toEqual({
      total: 0,
      pending: 0,
      active: 0,
      suspended: 0,
      contracts: 0,
    });
  });

  it('counts organizations by status and sums contracts', () => {
    const summary = summarizePipeline([
      org({ id: '1', status: 'PENDING_ONBOARDING', contractsCount: 1 }),
      org({ id: '2', status: 'ACTIVE', contractsCount: 2 }),
      org({ id: '3', status: 'ACTIVE', contractsCount: 0 }),
      org({ id: '4', status: 'SUSPENDED', contractsCount: 1 }),
    ]);
    expect(summary).toEqual({
      total: 4,
      pending: 1,
      active: 2,
      suspended: 1,
      contracts: 4,
    });
  });
});
