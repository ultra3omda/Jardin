import { Module } from '@nestjs/common';

import { NotificationFanoutService } from './notification-fanout.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * V8 — Notifications module.
 *
 * PrismaService is available globally via @Global PrismaModule — no local import needed.
 * ResendService (EmailModule) and ExpoPushService (PushModule) are also global.
 *
 * Both NotificationsService and (V10) NotificationFanoutService are exported so
 * other modules (MessagingModule, EvaluationsModule, AttendanceModule,
 * BillingModule, AnnouncementsModule, …) can inject them to fan-out
 * notifications across channels without going through HTTP.
 */
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationFanoutService],
  exports: [NotificationsService, NotificationFanoutService],
})
export class NotificationsModule {}
