import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * V8 — Notifications module.
 *
 * PrismaService is available globally via @Global PrismaModule — no local import needed.
 *
 * NotificationsService is exported so other modules (MessagingModule,
 * EvaluationsModule, BulletinsModule, …) can inject it to fan-out
 * notifications without going through HTTP.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
