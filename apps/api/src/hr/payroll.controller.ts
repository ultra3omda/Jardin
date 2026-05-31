import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PayrollService } from './payroll.service';
import {
  AddPayslipComponentDto,
  GeneratePayslipDto,
  ListPayslipsQueryDto,
  ListPayslipsResponseDto,
  PayslipResponseDto,
} from './dto/payslip.dto';

/**
 * T2c V3 — Bulletins de paie.
 * RBAC : SCHOOL_ADMIN/SUPER_ADMIN = CRUD complet + émission. TEACHER/STAFF =
 * lecture de leurs propres bulletins uniquement (filtrage forcé dans le service).
 */
@ApiTags('hr-payroll')
@ApiBearerAuth('access-token')
@Controller('hr/payslips')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List payslips (admins: all/by employee/period; employees: own)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPayslipsQueryDto,
  ): Promise<ListPayslipsResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PayslipResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate a payslip from the employee active contract' })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneratePayslipDto,
  ): Promise<PayslipResponseDto> {
    return this.service.generate(dto, user);
  }

  @Post(':id/components')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add an earning/deduction component (DRAFT only) and recompute' })
  addComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddPayslipComponentDto,
  ): Promise<PayslipResponseDto> {
    return this.service.addComponent(id, dto, user);
  }

  @Delete(':id/components/:componentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove a component (DRAFT only) and recompute' })
  removeComponent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('componentId') componentId: string,
  ): Promise<PayslipResponseDto> {
    return this.service.removeComponent(id, componentId, user);
  }

  @Post(':id/issue')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Issue a payslip (DRAFT → ISSUED)' })
  issue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PayslipResponseDto> {
    return this.service.issue(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
