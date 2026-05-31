import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SmsService } from './sms.service';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (k: string, d?: unknown) => values[k] ?? d,
  } as unknown as ConfigService;
}

const ENABLED = {
  'sms.bearerToken': 'bearer_test',
  'sms.email': 'imed@klasso.tn',
  'sms.password': 'secret',
  'sms.host': 'inside.api.orange.tn',
  'sms.sendPath': '/BulkSmsAPI/1.0/campaigns/basicApi/sendSms',
};

describe('SmsService (Orange)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is disabled (skipped) when Orange creds are unset', async () => {
    const svc = new SmsService(configWith({}));
    const res = await svc.send('20123456', 'hello');
    expect(res).toEqual({ success: false, skipped: true, error: 'SMS disabled' });
  });

  it('skips when there is no recipient', async () => {
    const svc = new SmsService(configWith(ENABLED));
    expect((await svc.send(null, 'x')).skipped).toBe(true);
  });

  it('posts to Orange BulkSmsAPI with +216 prefix, FR language and dual auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ key: 'SMS_SENT_SUCCESSFULLY', error: null }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const svc = new SmsService(configWith(ENABLED));
    const res = await svc.send('20123456', 'Code OTP 123456');
    expect(res.success).toBe(true);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      'https://inside.api.orange.tn/BulkSmsAPI/1.0/campaigns/basicApi/sendSms',
    );
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Bearer bearer_test, Basic /);
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toMatchObject({ language: 'FR', sms_content: 'Code OTP 123456' });
    expect(body.contacts).toEqual(['+21620123456']);
  });

  it('treats key !== SMS_SENT_SUCCESSFULLY as failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 200, json: async () => ({ key: 'ERR', error: 'nope' }) }),
    );
    const svc = new SmsService(configWith(ENABLED));
    expect((await svc.send('20123456', 'x')).success).toBe(false);
  });

  it('treats non-200 as failure and never throws on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401, json: async () => ({}) }));
    expect((await new SmsService(configWith(ENABLED)).send('20123456', 'x')).success).toBe(false);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const res = await new SmsService(configWith(ENABLED)).send('20123456', 'x');
    expect(res.success).toBe(false);
    expect(res.error).toContain('boom');
  });

  it('keeps an already-international number unchanged', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ status: 200, json: async () => ({ key: 'SMS_SENT_SUCCESSFULLY' }) });
    vi.stubGlobal('fetch', fetchMock);
    await new SmsService(configWith(ENABLED)).send('+21698765432', 'x');
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1].body));
    expect(body.contacts).toEqual(['+21698765432']);
  });
});
