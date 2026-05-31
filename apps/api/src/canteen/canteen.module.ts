import { Module } from '@nestjs/common';

import { CanteenMenusController } from './canteen-menus.controller';
import { CanteenMenusService } from './canteen-menus.service';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';

/**
 * T2b — Cantine : menus (niveau école) + régimes alimentaires (1/élève).
 * RBAC : SCHOOL_ADMIN + STAFF gèrent · PARENT lit (menus + régimes de ses enfants).
 */
@Module({
  controllers: [CanteenMenusController, MealPlansController],
  providers: [CanteenMenusService, MealPlansService],
})
export class CanteenModule {}
