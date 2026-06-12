import { Global, Module } from '@nestjs/common';

import { SmsLogService } from './sms-log.service';
import { SmsService } from './sms.service';

/**
 * GTM — Exposes the Orange SMS sender app-wide (@Global), mirroring PushModule,
 * so feature modules / NotificationFanoutService can inject it without importing.
 * G2 — adds SmsLogService (envoi historisé, masquage PII).
 */
@Global()
@Module({
  providers: [SmsService, SmsLogService],
  exports: [SmsService, SmsLogService],
})
export class SmsModule {}
