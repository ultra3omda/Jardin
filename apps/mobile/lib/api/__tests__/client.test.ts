/**
 * Tests for fetchApi / ApiError — focus on the structured error parsing
 * (code + details) that the auto-tenant login flow depends on.
 *
 * The API returns BadRequestException({ code, message, availableTenantSlugs })
 * when an email matches users in several tenants. The mobile client must
 * surface `code` and `details` so the login screen can show a tenant picker.
 */

import { ApiError, fetchApi } from '../client';

function mockFetchResponse(status: number, body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'Error',
    json: async () => body,
  }) as unknown as typeof fetch;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fetchApi structured error parsing', () => {
  it('throws ApiError carrying the API error code', async () => {
    mockFetchResponse(400, {
      code: 'TENANT_SLUG_REQUIRED',
      message: 'Multiple accounts match this email. Specify tenantSlug.',
      availableTenantSlugs: ['smiley', 'demo-ecole'],
    });

    await expect(
      fetchApi('/api/auth/login', { method: 'POST' }, false),
    ).rejects.toMatchObject({ status: 400, code: 'TENANT_SLUG_REQUIRED' });
  });

  it('exposes availableTenantSlugs through details', async () => {
    mockFetchResponse(400, {
      code: 'TENANT_SLUG_REQUIRED',
      message: 'x',
      availableTenantSlugs: ['a', 'b'],
    });

    expect.assertions(2);
    try {
      await fetchApi('/x', {}, false);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).details?.availableTenantSlugs).toEqual(['a', 'b']);
    }
  });

  it('keeps message/status and leaves code undefined for plain errors', async () => {
    mockFetchResponse(401, { message: 'Invalid credentials' });

    expect.assertions(3);
    try {
      await fetchApi('/x', {}, false);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(401);
      expect(apiErr.message).toBe('Invalid credentials');
      expect(apiErr.code).toBeUndefined();
    }
  });
});
