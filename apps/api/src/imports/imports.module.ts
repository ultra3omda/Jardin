import { Module } from '@nestjs/common';

import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

/**
 * Generic Excel/CSV import engine. Data-driven via the entity registry
 * (registry/index.ts): each importable module = one ImportEntityDef.
 * PrismaService is @Global.
 */
@Module({
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
