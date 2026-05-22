import { Global, Module } from '@nestjs/common';

import { ResendService } from './resend.service';

/**
 * Exposes the email sender app-wide. @Global() so feature modules can inject
 * `ResendService` without each one importing `EmailModule` explicitly.
 */
@Global()
@Module({
  providers: [ResendService],
  exports: [ResendService],
})
export class EmailModule {}
