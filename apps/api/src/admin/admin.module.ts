import { Module, OnApplicationBootstrap } from '@nestjs/common';

import { EmailModule } from '../common/email/email.module';
import { DnsModule } from '../dns/dns.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { DomainProvisioningService } from './domain-provisioning.service';
import { InviteTokensController } from './invite-tokens.controller';
import { InviteTokensService } from './invite-tokens.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [EmailModule, DnsModule],
  controllers: [InviteTokensController, TenantsController, AuditController, PlatformAnalyticsController],
  providers: [InviteTokensService, TenantsService, AuditService, PlatformAnalyticsService, DomainProvisioningService],
  exports: [InviteTokensService, TenantsService],
})
export class AdminModule implements OnApplicationBootstrap {
  constructor(private readonly domains: DomainProvisioningService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.domains.reconcilePending();
  }
}
