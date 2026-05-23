import { describe, it, expect } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2Service } from './r2.service';

function buildConfig(map: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string, fallback?: string) => map[key] ?? fallback,
  } as unknown as ConfigService;
}

describe('R2Service', () => {
  it('isEnabled is false when env missing', () => {
    const svc = new R2Service(buildConfig({}));
    expect(svc.isEnabled()).toBe(false);
  });

  it('signedPutUrl throws when disabled', async () => {
    const svc = new R2Service(buildConfig({}));
    await expect(svc.signedPutUrl('a/b.png', 'image/png')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('signedGetUrl throws when disabled', async () => {
    const svc = new R2Service(buildConfig({}));
    await expect(svc.signedGetUrl('a/b.png')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('putBuffer throws when disabled', async () => {
    const svc = new R2Service(buildConfig({}));
    await expect(
      svc.putBuffer('a/b.png', Buffer.from(''), 'image/png'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
