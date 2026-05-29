import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiOk, authHeaders, apiGet } from './http';

function makeResponse(status: number, body?: unknown): Response {
  if (body === undefined) return new Response(null, { status });
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authHeaders', () => {
  it('includes bearer token and json content type', () => {
    expect(authHeaders('abc')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });
});

describe('apiOk', () => {
  it('parses JSON body on 200', async () => {
    expect(await apiOk<{ id: string }>(makeResponse(200, { id: 'x' }))).toEqual({ id: 'x' });
  });

  it('returns undefined on 204', async () => {
    expect(await apiOk(makeResponse(204))).toBeUndefined();
  });

  it('throws ApiError with server message on 400', async () => {
    await expect(apiOk(makeResponse(400, { message: 'Bad input' }))).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Bad input',
    });
  });

  it('uses the first array message when message is an array', async () => {
    await expect(
      apiOk(makeResponse(422, { message: ['email must be valid', 'x'] })),
    ).rejects.toMatchObject({ status: 422, message: 'email must be valid' });
  });

  it('falls back to a status message when body is not JSON', async () => {
    await expect(apiOk(makeResponse(500))).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
    });
  });
});

describe('apiGet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls fetch with auth headers and returns the parsed body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(200, { ok: true }));
    expect(await apiGet<{ ok: boolean }>('/api/x', 'tok')).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
    });
  });
});
