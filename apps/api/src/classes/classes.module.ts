import { Module } from '@nestjs/common';

import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

/** V4 — Classes + Teachers assignments + EDT TimeSlots. G7 — passage de classe. */
@Module({
  controllers: [ClassesController, PromotionController],
  providers: [ClassesService, PromotionService],
  exports: [ClassesService],
})
export class ClassesModule {}
