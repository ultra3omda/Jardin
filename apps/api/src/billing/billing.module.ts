import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoicePdfService } from './invoice-pdf.service';

/** V8 — Billing: Invoices & Payments. */
@Module({
  imports: [NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, InvoicePdfService],
  exports: [BillingService],
})
export class BillingModule {}
