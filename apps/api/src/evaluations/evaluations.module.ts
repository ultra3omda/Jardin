import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

/** V6 — Evaluations + Grades (TEACHER & SCHOOL_ADMIN). */
@Module({
  imports: [NotificationsModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
