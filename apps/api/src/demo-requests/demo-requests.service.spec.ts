/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { DemoRequestsService } from './demo-requests.service';

describe('DemoRequestsService.submit', () => {
  let service: DemoRequestsService;
  let resend: any;
  let prisma: any;
  let config: any;

  beforeEach(async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    resend = { send: vi.fn().mockResolvedValue({ success: true, id: 'r1' }) };
    prisma = { auditLog: { create: vi.fn().mockResolvedValue({}) } };
    config = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'turnstile.secretKey') return 'TEST_SECRET';
        if (key === 'demoRequest.toEmail') return 'team@klasso.tn';
        return undefined;
      }),
    };

    const mod = await Test.createTestingModule({
      providers: [
        DemoRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResendService, useValue: resend },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(DemoRequestsService);
  });

  it('sends email + writes audit log on valid Turnstile', async () => {
    const res = await service.submit(
      { firstName: 'K', lastName: 'B', email: 'k@e.tn', schoolName: 'É', studentsCount: '50-200', locale: 'fr', turnstileToken: 'cf-ok' } as any,
      { ip: '1.2.3.4', userAgent: 'test' },
    );
    expect(res.success).toBe(true);
    expect(res.requestId).toMatch(/^dr_/);
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('throws BadRequest TURNSTILE_FAILED on invalid token', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, 'error-codes': ['bad'] }) });
    await expect(service.submit({ firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É', studentsCount: '<50', locale: 'fr', turnstileToken: 'bad' } as any, {})).rejects.toThrow(BadRequestException);
    expect(resend.send).not.toHaveBeenCalled();
  });

  it('sends Arabic-localized email when locale=ar', async () => {
    await service.submit({ firstName: 'م', lastName: 'ب', email: 'm@e.tn', schoolName: 'مدرسة', studentsCount: '<50', locale: 'ar', turnstileToken: 'ok' } as any, {});
    expect(resend.send).toHaveBeenCalledTimes(1);
    const call = resend.send.mock.calls[0][0];
    expect(call.subject).toContain('كلاسو');
  });

  it('handles Resend failure gracefully (returns success)', async () => {
    resend.send.mockResolvedValueOnce({ success: false, error: 'rate-limited' });
    const res = await service.submit({ firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É', studentsCount: '<50', locale: 'fr', turnstileToken: 'ok' } as any, {});
    expect(res.success).toBe(true);
  });

  it('builds proper Cloudflare siteverify URL', async () => {
    await service.submit({ firstName: 'X', lastName: 'Y', email: 'x@y.tn', schoolName: 'É', studentsCount: '<50', locale: 'fr', turnstileToken: 'cf-test' } as any, { ip: '5.6.7.8' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = (global.fetch as any).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('secret')).toBe('TEST_SECRET');
    expect(body.get('response')).toBe('cf-test');
    expect(body.get('remoteip')).toBe('5.6.7.8');
  });
});
