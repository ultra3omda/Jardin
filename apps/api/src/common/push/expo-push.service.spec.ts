import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';

const VALID_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

type PrismaMock = { user: { updateMany: ReturnType<typeof vi.fn> } };

/** Build a fresh service. accessToken is read once in the constructor. */
async function buildService(opts?: { accessToken?: string }): Promise<{
  service: ExpoPushService;
  prisma: PrismaMock;
}> {
  const prisma: PrismaMock = {
    user: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      ExpoPushService,
      {
        provide: ConfigService,
        useValue: {
          get: vi.fn((key: string) =>
            key === 'push.expoAccessToken' ? opts?.accessToken : undefined,
          ),
        },
      },
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();

  return { service: moduleRef.get(ExpoPushService), prisma };
}

/** Minimal fetch Response stub carrying a JSON body. */
function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe('ExpoPushService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('isExpoPushToken', () => {
    it('accepts ExponentPushToken[...] and ExpoPushToken[...] formats', () => {
      expect(ExpoPushService.isExpoPushToken('ExponentPushToken[abc123]')).toBe(true);
      expect(ExpoPushService.isExpoPushToken('ExpoPushToken[abc123]')).toBe(true);
    });

    it('rejects malformed tokens', () => {
      expect(ExpoPushService.isExpoPushToken('not-a-token')).toBe(false);
      expect(ExpoPushService.isExpoPushToken('ExponentPushToken[]')).toBe(false);
      expect(ExpoPushService.isExpoPushToken('FCM[abc]')).toBe(false);
    });
  });

  describe('send', () => {
    it('skips (no network) when token is null/undefined', async () => {
      const { service } = await buildService();

      const result = await service.send(null, 'T', 'B');

      expect(result).toEqual({ success: false, skipped: true, error: 'No push token' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('skips and clears the token when the format is invalid', async () => {
      const { service, prisma } = await buildService();

      const result = await service.send('garbage-token', 'T', 'B');

      expect(result.skipped).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { expoPushToken: 'garbage-token' },
        data: { expoPushToken: null },
      });
    });

    it('POSTs an array payload to the Expo endpoint and returns success on an ok ticket', async () => {
      const { service } = await buildService();
      fetchMock.mockResolvedValue(jsonResponse({ data: [{ status: 'ok', id: 'ticket-1' }] }));

      const result = await service.send(VALID_TOKEN, 'Hello', 'World', { url: '/messages' });

      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://exp.host/--/api/v2/push/send');
      expect(init.method).toBe('POST');
      const sent = JSON.parse(init.body as string);
      expect(Array.isArray(sent)).toBe(true);
      expect(sent[0]).toMatchObject({
        to: VALID_TOKEN,
        title: 'Hello',
        body: 'World',
        data: { url: '/messages' },
      });
    });

    it('omits the Authorization header when no access token is configured', async () => {
      const { service } = await buildService();
      fetchMock.mockResolvedValue(jsonResponse({ data: [{ status: 'ok' }] }));

      await service.send(VALID_TOKEN, 'T', 'B');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('adds a Bearer Authorization header when an access token is configured', async () => {
      const { service } = await buildService({ accessToken: 'secret-expo-token' });
      fetchMock.mockResolvedValue(jsonResponse({ data: [{ status: 'ok' }] }));

      await service.send(VALID_TOKEN, 'T', 'B');

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer secret-expo-token');
    });

    it('clears the token when Expo reports DeviceNotRegistered', async () => {
      const { service, prisma } = await buildService();
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: [{ status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }],
        }),
      );

      const result = await service.send(VALID_TOKEN, 'T', 'B');

      expect(result.success).toBe(false);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { expoPushToken: VALID_TOKEN },
        data: { expoPushToken: null },
      });
    });

    it('does not clear the token for a non-DeviceNotRegistered error ticket', async () => {
      const { service, prisma } = await buildService();
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: [
            { status: 'error', message: 'rate limited', details: { error: 'MessageRateExceeded' } },
          ],
        }),
      );

      const result = await service.send(VALID_TOKEN, 'T', 'B');

      expect(result).toEqual({ success: false, error: 'rate limited' });
      expect(prisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('returns a failure (never throws) on a non-2xx HTTP response', async () => {
      const { service } = await buildService();
      fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

      const result = await service.send(VALID_TOKEN, 'T', 'B');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('returns a failure (never throws) when fetch itself rejects', async () => {
      const { service } = await buildService();
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await service.send(VALID_TOKEN, 'T', 'B');

      expect(result).toEqual({ success: false, error: 'network down' });
    });

    it('swallows a failure while clearing a stale token (non-blocking)', async () => {
      const { service, prisma } = await buildService();
      prisma.user.updateMany.mockRejectedValue(new Error('db down'));
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: [{ status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }],
        }),
      );

      await expect(service.send(VALID_TOKEN, 'T', 'B')).resolves.toEqual(
        expect.objectContaining({ success: false }),
      );
    });
  });
});
