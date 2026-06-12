import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DishesService } from './dishes.service';
import {
  CreateDishDto,
  ReserveClassDto,
  ReserveDto,
  UpdateDishDto,
  UpdateReservationDto,
} from './dto/canteen-extra.dto';
import { ReservationsService } from './reservations.service';

/** G4 — Catalogue de plats + réservation de repas. */
@ApiTags('canteen')
@ApiBearerAuth()
@Controller('canteen')
export class CanteenExtraController {
  constructor(
    private readonly dishes: DishesService,
    private readonly reservations: ReservationsService,
  ) {}

  // ─── Dishes (catalogue) ──────────────────────────────────────────────────

  @Get('dishes')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  listDishes(@CurrentUser() u: AuthenticatedUser) {
    return this.dishes.list(u.tenantId!);
  }

  @Post('dishes')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  createDish(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateDishDto) {
    return this.dishes.create(u.tenantId!, dto);
  }

  @Patch('dishes/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  updateDish(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
  ) {
    return this.dishes.update(u.tenantId!, id, dto);
  }

  @Delete('dishes/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  deleteDish(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.dishes.remove(u.tenantId!, id);
  }

  // ─── Reservations ────────────────────────────────────────────────────────
  // NOTE: routes littérales (class, stats) déclarées AVANT :id (routing NestJS).

  @Get('reservations')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  listReservations(
    @CurrentUser() u: AuthenticatedUser,
    @Query('date') date?: string,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.reservations.list(u, { date, classId, studentId });
  }

  @Get('reservations/stats')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Stats : repas/jour + répartition régimes' })
  stats(
    @CurrentUser() u: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reservations.stats(u.tenantId!, from, to);
  }

  @Post('reservations')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  reserve(@CurrentUser() u: AuthenticatedUser, @Body() dto: ReserveDto) {
    return this.reservations.reserve(u, dto.studentId, dto.date);
  }

  @Post('reservations/class')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  reserveClass(@CurrentUser() u: AuthenticatedUser, @Body() dto: ReserveClassDto) {
    return this.reservations.reserveClass(u.tenantId!, u.id, dto.classId, dto.date);
  }

  @Patch('reservations/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  setStatus(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservations.setStatus(u.tenantId!, id, dto.status);
  }
}
