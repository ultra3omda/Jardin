import { Global, Module } from '@nestjs/common';

import { SmsService } from './sms.service';

/**
 * GTM — Exposes the Twilio SMS sender app-wide (@Global), mirroring PushModule,
 * so feature modules / NotificationFanoutService can inject it without importing.
 */
@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
