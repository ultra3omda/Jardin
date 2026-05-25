import { Module } from '@nestjs/common';

import { EmailModule } from '../common/email/email.module';
import { InviteTokensController } from './invite-tokens.controller';
import { InviteTokensService } from './invite-tokens.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [EmailModule],
  controllers: [InviteTokensController, TenantsController],
  providers: [InviteTokensService, TenantsService],
  exports: [InviteTokensService, TenantsService],
})
export class AdminModule {}
