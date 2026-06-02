import { Module } from '@nestjs/common';

import { HomeworkController } from './homework.controller';
import { HomeworkService } from './homework.service';

/**
 * Devoirs (TAF). PrismaService + R2Service sont @Global, donc aucun `imports`.
 */
@Module({
  controllers: [HomeworkController],
  providers: [HomeworkService],
})
export class HomeworkModule {}
