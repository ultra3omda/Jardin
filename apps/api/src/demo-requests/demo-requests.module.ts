import { Module } from '@nestjs/common';

import { DemoRequestsController } from './demo-requests.controller';
import { DemoRequestsService } from './demo-requests.service';

/**
 * Public landing page demo-request form pipeline.
 * EmailModule is @Global() so ResendService is available without explicit import.
 * PrismaModule is also @Global() — no imports needed here.
 */
@Module({
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
