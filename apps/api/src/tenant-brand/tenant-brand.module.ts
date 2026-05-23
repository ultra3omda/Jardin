import { Module } from '@nestjs/common';

import { TenantBrandController } from './tenant-brand.controller';
import { TenantBrandPublicController } from './tenant-brand.public.controller';
import { TenantBrandService } from './tenant-brand.service';

/**
 * Module bundling the admin + public branding controllers and the service.
 * R2Service is @Global (provided by R2Module), so we don't import it here.
 * PrismaService is @Global (PrismaModule).
 */
@Module({
  controllers: [TenantBrandController, TenantBrandPublicController],
  providers: [TenantBrandService],
  exports: [TenantBrandService],
})
export class TenantBrandModule {}
