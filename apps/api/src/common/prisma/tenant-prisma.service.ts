import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Legacy alias kept for backward compatibility.
 *
 * Since the Phase 1 isolation hardening, {@link PrismaService} itself IS the
 * tenant-guarded client (the extension is wired globally in its constructor).
 * `.client` therefore simply returns the injected PrismaService — both paths
 * go through the same tenant-isolation extension.
 *
 * New code should inject {@link PrismaService} directly.
 */
@Injectable()
export class TenantPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  /** The tenant-scoped Prisma client (same instance as PrismaService). */
  get client(): PrismaService {
    return this.prisma;
  }
}
