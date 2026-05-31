import { Injectable, OnModuleInit } from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { PrismaService } from './prisma.service';
import { createTenantExtension } from './tenant.extension';

/**
 * Wraps {@link PrismaService} with the multi-tenant Prisma client extension.
 *
 * Services that handle tenant-scoped data MUST inject this service and use
 * `.client` for all queries — that way the extension auto-injects
 * `where: { tenantId }` based on the current {@link TenantContextService}.
 *
 * The raw {@link PrismaService} is still available for the auth service
 * (cross-tenant email lookup before issuing tokens) and seeds.
 */
@Injectable()
export class TenantPrismaService implements OnModuleInit {
  private extended!: ReturnType<typeof this.buildExtended>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  onModuleInit(): void {
    this.extended = this.buildExtended();
  }

  /** The tenant-scoped Prisma client. */
  get client(): ReturnType<typeof this.buildExtended> {
    return this.extended;
  }

  private buildExtended() {
    return this.prisma.$extends(
      createTenantExtension({
        getTenantId: () => this.tenantContext.getTenantId(),
        shouldSkip: () => this.tenantContext.shouldSkipTenantFilter(),
        getRole: () => this.tenantContext.get()?.role ?? null,
      }),
    );
  }
}
