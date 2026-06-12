import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { ObservationsController } from './observations.controller';
import { ObservationsService } from './observations.service';

/** G3 — Observations structurées. R2 (médias) est @Global ; fanout via NotificationsModule. */
@Module({
  imports: [NotificationsModule],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
