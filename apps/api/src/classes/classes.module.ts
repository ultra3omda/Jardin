import { Module } from '@nestjs/common';

import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

/** V4 — Classes + Teachers assignments + EDT TimeSlots. */
@Module({
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
