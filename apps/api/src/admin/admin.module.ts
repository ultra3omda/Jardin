import { Module } from '@nestjs/common';

import { InviteTokensController } from './invite-tokens.controller';
import { InviteTokensService } from './invite-tokens.service';

@Module({
  controllers: [InviteTokensController],
  providers: [InviteTokensService],
  exports: [InviteTokensService],
})
export class AdminModule {}
