import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContractsService } from './contracts.service';
import {
  CreateEmploymentContractDto,
  EmploymentContractResponseDto,
  ListContractsQueryDto,
  ListContractsResponseDto,
  UpdateEmploymentContractDto,
} from './dto/employment-contract.dto';

/**
 * T2c V1 — Contrats de travail.
 * RBAC : SCHOOL_ADMIN/SUPER_ADMIN = CRUD complet. TEACHER/STAFF = lecture de
 * leurs propres contrats uniquement (filtrage forcé dans le service).
 */
@ApiTags('hr-contracts')
@ApiBearerAuth('access-token')
@Controller('hr/contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  @ApiOperation({ summary: 'List employment contracts (admins: all/by employee; employees: own)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListContractsQueryDto,
  ): Promise<ListContractsResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STAFF)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EmploymentContractResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmploymentContractDto,
  ): Promise<EmploymentContractResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentContractDto,
  ): Promise<EmploymentContractResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Post(':id/end')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'End a contract (status ENDED + endDate)' })
  end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<EmploymentContractResponseDto> {
    return this.service.end(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
