import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CashRegisterService } from './cash-register.service';
import {
  AddMovementDto,
  CloseSessionDto,
  CreateExpenseDto,
  CreateSupplierDto,
  OpenSessionDto,
} from './dto/cash-register.dto';
import { ExpensesService } from './expenses.service';

/** G1 — Caisse, dépenses, fournisseurs (SCHOOL_ADMIN / STAFF). */
@ApiTags('cash-register')
@ApiBearerAuth()
@Controller()
export class CashRegisterController {
  constructor(
    private readonly cash: CashRegisterService,
    private readonly exp: ExpensesService,
  ) {}

  // ─── Cash register ───────────────────────────────────────────────────────

  @Post('cash-register/open')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Ouvre la caisse du jour' })
  open(@CurrentUser() u: AuthenticatedUser, @Body() dto: OpenSessionDto) {
    return this.cash.open(u.tenantId!, u.id, dto);
  }

  @Get('cash-register/current')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  current(@CurrentUser() u: AuthenticatedUser) {
    return this.cash.current(u.tenantId!);
  }

  @Post('cash-register/:id/movements')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  move(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddMovementDto,
  ) {
    return this.cash.addMovement(u.tenantId!, u.id, id, dto);
  }

  @Post('cash-register/:id/close')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Clôture la caisse et calcule l’écart' })
  close(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
  ) {
    return this.cash.close(u.tenantId!, u.id, id, dto);
  }

  @Get('cash-register/closures')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  closures(@CurrentUser() u: AuthenticatedUser) {
    return this.cash.closures(u.tenantId!);
  }

  // ─── Suppliers ───────────────────────────────────────────────────────────

  @Get('suppliers')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  suppliers(@CurrentUser() u: AuthenticatedUser) {
    return this.exp.listSuppliers(u.tenantId!);
  }

  @Post('suppliers')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  addSupplier(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateSupplierDto) {
    return this.exp.createSupplier(u.tenantId!, dto);
  }

  @Delete('suppliers/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  delSupplier(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.exp.deleteSupplier(u.tenantId!, id);
  }

  // ─── Expenses ────────────────────────────────────────────────────────────

  @Get('expenses')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  expenses(
    @CurrentUser() u: AuthenticatedUser,
    @Query('category') category?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.exp.listExpenses(u.tenantId!, { category, supplierId });
  }

  @Post('expenses')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  addExpense(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateExpenseDto) {
    return this.exp.createExpense(u.tenantId!, u.id, dto);
  }
}
