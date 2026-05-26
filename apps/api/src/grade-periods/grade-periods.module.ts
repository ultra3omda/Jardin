import { Module } from '@nestjs/common';

import { GradePeriodsController } from './grade-periods.controller';
import { GradePeriodsService } from './grade-periods.service';

/** V6 — Grade periods (trimestres / semestres). */
@Module({
  controllers: [GradePeriodsController],
  providers: [GradePeriodsService],
  exports: [GradePeriodsService],
})
export class GradePeriodsModule {}
