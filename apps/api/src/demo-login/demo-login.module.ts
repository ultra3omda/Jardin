import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DemoLoginController } from './demo-login.controller';
import { DemoLoginService } from './demo-login.service';

/** V7 — Demo login (auto-login for demo personas). */
@Module({
  imports: [AuthModule],
  controllers: [DemoLoginController],
  providers: [DemoLoginService],
})
export class DemoLoginModule {}
