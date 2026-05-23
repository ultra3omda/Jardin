import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_BRAND } from '@ecole-saas/shared';
import { TenantBrandService } from './tenant-brand.service';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { R2Service } from '../common/r2/r2.service';

interface MockPrisma {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}
interface MockR2 {
  signedPutUrl: ReturnType<typeof vi.fn>;
}
interface MockConfig {
  get: ReturnType<typeof vi.fn>;
}

describe('TenantBrandService', () => {
  let svc: TenantBrandService;
  let prisma: MockPrisma;
  let r2: MockR2;
  let config: MockConfig;

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    r2 = { signedPutUrl: vi.fn() };
    config = { get: vi.fn() };
    svc = new TenantBrandService(
      prisma as unknown as PrismaService,
      r2 as unknown as R2Service,
      config as unknown as ConfigService,
    );
  });

  describe('findByTenant', () => {
    it('returns DEFAULT_BRAND when brand is null', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ brand: null });
      const result = await svc.findByTenant('t1');
      expect(result).toEqual(DEFAULT_BRAND);
    });

    it('merges stored brand over DEFAULT_BRAND', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        brand: { primaryColor: '#ff0000' },
      });
      const result = await svc.findByTenant('t1');
      expect(result.primaryColor).toBe('#ff0000');
      expect(result.primaryHover).toBe(DEFAULT_BRAND.primaryHover);
    });

    it('returns DEFAULT_BRAND when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const result = await svc.findByTenant('missing');
      expect(result).toEqual(DEFAULT_BRAND);
    });
  });

  describe('findBySlug', () => {
    it('returns name + merged brand on hit', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        name: 'Alpha School',
        brand: { logoUrl: 'https://x/y.png' },
        deletedAt: null,
      });
      const result = await svc.findBySlug('alpha');
      expect(result?.name).toBe('Alpha School');
      expect(result?.brand.logoUrl).toBe('https://x/y.png');
      expect(result?.brand.primaryColor).toBe(DEFAULT_BRAND.primaryColor);
    });

    it('returns null on unknown slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      const result = await svc.findBySlug('nope');
      expect(result).toBeNull();
    });

    it('returns null on soft-deleted tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 't1',
        name: 'Old',
        brand: null,
        deletedAt: new Date(),
      });
      const result = await svc.findBySlug('old');
      expect(result).toBeNull();
    });

    it('lowercases the slug query', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await svc.findBySlug('UPPER');
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'upper' } }),
      );
    });
  });

  describe('update', () => {
    it('rejects logoUrl outside R2_PUBLIC_URL (anti-SSRF)', async () => {
      config.get.mockReturnValue('https://assets.ecole-saas.com');
      prisma.tenant.findUnique.mockResolvedValue({ brand: null });
      await expect(
        svc.update('t1', { logoUrl: 'http://evil.tld/logo.png' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts logoUrl inside R2_PUBLIC_URL', async () => {
      config.get.mockReturnValue('https://assets.ecole-saas.com');
      prisma.tenant.findUnique.mockResolvedValue({ brand: null });
      prisma.tenant.update.mockResolvedValue({});
      await svc.update('t1', {
        logoUrl: 'https://assets.ecole-saas.com/tenants/t1/logo.png',
      });
      expect(prisma.tenant.update).toHaveBeenCalled();
    });

    it('accepts null logoUrl (removal)', async () => {
      config.get.mockReturnValue('https://assets.ecole-saas.com');
      prisma.tenant.findUnique.mockResolvedValue({
        brand: { logoUrl: 'https://assets.ecole-saas.com/x.png' },
      });
      prisma.tenant.update.mockResolvedValue({});
      await svc.update('t1', { logoUrl: null });
      expect(prisma.tenant.update).toHaveBeenCalled();
    });

    it('skips anti-SSRF check when R2_PUBLIC_URL is undefined (dev mode)', async () => {
      config.get.mockReturnValue(undefined);
      prisma.tenant.findUnique.mockResolvedValue({ brand: null });
      prisma.tenant.update.mockResolvedValue({});
      await expect(
        svc.update('t1', { logoUrl: 'http://anywhere/logo.png' }),
      ).resolves.toBeDefined();
    });
  });

  describe('reset', () => {
    it('writes brand: null and returns DEFAULT_BRAND', async () => {
      prisma.tenant.update.mockResolvedValue({});
      const result = await svc.reset('t1');
      expect(result).toEqual(DEFAULT_BRAND);
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { brand: null },
      });
    });
  });

  describe('createUploadUrl', () => {
    it('rejects non-image contentType', async () => {
      await expect(
        svc.createUploadUrl('t1', {
          kind: 'logo',
          contentType: 'application/pdf',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns signed URL + final URL for image/png', async () => {
      config.get.mockImplementation((k: string, fb?: string) =>
        k === 'r2.publicUrl'
          ? 'https://assets.ecole-saas.com'
          : k === 'r2.tenantAssetsBucket'
            ? 'ecole-saas-tenant-assets'
            : fb,
      );
      r2.signedPutUrl.mockResolvedValue('https://upload.example/signed');
      const result = await svc.createUploadUrl('t1', {
        kind: 'logo',
        contentType: 'image/png',
      });
      expect(result.uploadUrl).toBe('https://upload.example/signed');
      expect(result.finalUrl).toMatch(
        /^https:\/\/assets\.ecole-saas\.com\/tenants\/t1\/logo-/,
      );
      expect(result.finalUrl).toMatch(/\.png$/);
      expect(r2.signedPutUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^tenants\/t1\/logo-/),
        'image/png',
        300,
        'ecole-saas-tenant-assets',
      );
    });

    it('falls back to r2:// scheme when publicUrl undefined', async () => {
      config.get.mockImplementation((k: string, fb?: string) =>
        k === 'r2.tenantAssetsBucket' ? 'ecole-saas-tenant-assets' : fb,
      );
      r2.signedPutUrl.mockResolvedValue('https://upload.example/signed');
      const result = await svc.createUploadUrl('t1', {
        kind: 'favicon',
        contentType: 'image/x-icon',
      });
      expect(result.finalUrl).toMatch(
        /^r2:\/\/ecole-saas-tenant-assets\/tenants\/t1\/favicon-/,
      );
      expect(result.finalUrl).toMatch(/\.ico$/);
    });
  });
});
