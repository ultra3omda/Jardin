import { Module } from '@nestjs/common';

import { EmailModule } from '../common/email/email.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { InviteTokensController } from './invite-tokens.controller';
import { InviteTokensService } from './invite-tokens.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [EmailModule],
  controllers: [InviteTokensController, TenantsController, AuditController, PlatformAnalyticsController],
  providers: [InviteTokensService, TenantsService, AuditService, PlatformAnalyticsService],
  exports: [InviteTokensService, TenantsService],
})
export class AdminModule {}
