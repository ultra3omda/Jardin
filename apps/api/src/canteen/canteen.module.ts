import { Module } from '@nestjs/common';

import { CanteenExtraController } from './canteen-extra.controller';
import { CanteenMenusController } from './canteen-menus.controller';
import { CanteenMenusService } from './canteen-menus.service';
import { DishesService } from './dishes.service';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { ReservationsService } from './reservations.service';

/**
 * T2b — Cantine : menus (niveau école) + régimes alimentaires (1/élève).
 * G4 — catalogue de plats + réservation de repas + stats.
 * RBAC : SCHOOL_ADMIN + STAFF gèrent · PARENT lit/réserve pour ses enfants.
 */
@Module({
  controllers: [CanteenMenusController, MealPlansController, CanteenExtraController],
  providers: [CanteenMenusService, MealPlansService, DishesService, ReservationsService],
})
export class CanteenModule {}
