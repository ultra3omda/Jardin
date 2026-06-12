import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  BulkAssignDto,
  CreateFeeTypeDto,
  RemindUnpaidDto,
  UpdateFeeTypeDto,
} from './dto/fees.dto';
import { FeesService } from './fees.service';

/** G2 — Référentiel de frais & affectation (SCHOOL_ADMIN). */
@ApiTags('billing-fees')
@ApiBearerAuth()
@Controller('billing')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get('fee-types')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'List fee types' })
  listFeeTypes(@CurrentUser() u: AuthenticatedUser) {
    return this.service.listFeeTypes(u.tenantId!);
  }

  @Post('fee-types')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create a fee type' })
  createFeeType(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateFeeTypeDto) {
    return this.service.createFeeType(u.tenantId!, dto);
  }

  @Patch('fee-types/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  updateFeeType(
    @CurrentUser() u: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFeeTypeDto,
  ) {
    return this.service.updateFeeType(u.tenantId!, id, dto);
  }

  @Delete('fee-types/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  deleteFeeType(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.deleteFeeType(u.tenantId!, id);
  }

  @Post('fee-assignments/bulk')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Affecte un frais en masse (classe/niveau)' })
  bulkAssign(@CurrentUser() u: AuthenticatedUser, @Body() dto: BulkAssignDto) {
    return this.service.bulkAssign(u.tenantId!, dto);
  }

  @Post('installments/:id/invoice')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Génère une Invoice pour une échéance' })
  invoice(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.service.generateInvoiceForInstallment(u.tenantId!, id);
  }

  @Get('unpaid')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Tableau de bord des impayés' })
  unpaid(
    @CurrentUser() u: AuthenticatedUser,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.service.listUnpaid(u.tenantId!, { classId, studentId });
  }

  @Post('unpaid/remind')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Relance notif + SMS pour les échéances impayées' })
  remind(@CurrentUser() u: AuthenticatedUser, @Body() dto: RemindUnpaidDto) {
    return this.service.remindUnpaid(u.tenantId!, dto.installmentIds);
  }
}
