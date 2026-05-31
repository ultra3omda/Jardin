import { Module } from '@nestjs/common';

import { TenantBrandModule } from '../tenant-brand/tenant-brand.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

/**
 * GTM — Blocking onboarding wizard for new SCHOOL_ADMINs. Reuses
 * TenantBrandService (branding + anti-SSRF logo validation).
 */
@Module({
  imports: [TenantBrandModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
