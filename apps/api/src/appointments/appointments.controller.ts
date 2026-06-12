import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppointmentsService } from './appointments.service';
import { BookDto, CreateSlotDto, CreateTypeDto, StatusDto } from './dto/appointments.dto';

/** G6 — Rendez-vous parents. */
@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  // ─── Types ────────────────────────────────────────────────────────────────

  @Get('types')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.PARENT)
  listTypes(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listTypes(u.tenantId!);
  }

  @Post('types')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  createType(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateTypeDto) {
    return this.service.createType(u.tenantId!, dto);
  }

  // ─── Slots ────────────────────────────────────────────────────────────────

  @Post('slots')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @ApiOperation({ summary: 'Crée un créneau' })
  createSlot(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateSlotDto) {
    return this.service.createSlot(u.tenantId!, dto);
  }

  @Get('slots')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER, UserRole.PARENT)
  availableSlots(@CurrentUser() u: AuthenticatedUser) {
    return this.service.availableSlots(u.tenantId!);
  }

  // ─── Parent ─────────────────────────────────────────────────────────────────

  @Get('mine')
  @Roles(UserRole.PARENT)
  mine(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listForParent(u.tenantId!, u.id);
  }

  @Post()
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Réserve un créneau (anti double-booking)' })
  book(@CurrentUser() u: AuthenticatedUser, @Body() dto: BookDto) {
    return this.service.book(u.tenantId!, u.id, dto);
  }

  // ─── Staff ──────────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER)
  staffList(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listForStaff(u.tenantId!);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.TEACHER)
  @ApiOperation({ summary: 'Confirme / annule / complète un rendez-vous' })
  setStatus(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StatusDto,
  ) {
    return this.service.setStatus(u.tenantId!, id, dto.status);
  }
}
