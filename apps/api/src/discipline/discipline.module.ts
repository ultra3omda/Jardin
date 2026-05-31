import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';

/** T2b — Discipline incidents (SCHOOL_ADMIN / TEACHER / PARENT-read). */
@Module({
  imports: [NotificationsModule],
  controllers: [DisciplineController],
  providers: [DisciplineService],
})
export class DisciplineModule {}
