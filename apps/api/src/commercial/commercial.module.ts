import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { CommercialController } from './commercial.controller';
import { CommercialService } from './commercial.service';

/**
 * GTM — Commercial back-office (rôle COMMERCIAL + SUPER_ADMIN).
 * Reuses InviteTokensService from AdminModule to mint tenant-bound invites.
 */
@Module({
  imports: [AdminModule],
  controllers: [CommercialController],
  providers: [CommercialService],
})
export class CommercialModule {}
