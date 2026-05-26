import { Module } from '@nestjs/common';

import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

/** V6 — Subjects (matières). */
@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
