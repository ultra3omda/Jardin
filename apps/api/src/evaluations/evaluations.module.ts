import { Module } from '@nestjs/common';

import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

/** V6 — Evaluations + Grades (TEACHER & SCHOOL_ADMIN). */
@Module({
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
