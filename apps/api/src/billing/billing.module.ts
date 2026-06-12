import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FeesController } from './fees/fees.controller';
import { FeesService } from './fees/fees.service';
import { InvoicePdfService } from './invoice-pdf.service';

/** V8 — Billing: Invoices & Payments. G2 — Référentiel de frais (Fees). */
@Module({
  imports: [NotificationsModule],
  controllers: [BillingController, FeesController],
  providers: [BillingService, InvoicePdfService, FeesService],
  exports: [BillingService],
})
export class BillingModule {}
