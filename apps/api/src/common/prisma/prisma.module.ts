import { Global, Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaService } from './prisma.service';
import { TenantPrismaService } from './tenant-prisma.service';

@Global()
@Module({
  // TenantModule is global, but importing it here guarantees PrismaService's
  // TenantContextService dependency resolves even in TestingModules that
  // import PrismaModule alone.
  imports: [TenantModule],
  providers: [PrismaService, TenantPrismaService],
  exports: [PrismaService, TenantPrismaService],
})
export class PrismaModule {}
