import { Global, Module } from '@nestjs/common';

import { ExpoPushService } from './expo-push.service';

/**
 * V10 — Exposes the Expo push sender app-wide. @Global() so feature modules
 * (and the NotificationFanoutService) can inject `ExpoPushService` without
 * importing `PushModule` explicitly. PrismaService is resolved from the
 * global PrismaModule.
 */
@Global()
@Module({
  providers: [ExpoPushService],
  exports: [ExpoPushService],
})
export class PushModule {}
