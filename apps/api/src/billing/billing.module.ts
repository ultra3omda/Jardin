import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

/** V8 — Billing: Invoices & Payments. */
@Module({
  imports: [NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
