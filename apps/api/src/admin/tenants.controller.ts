import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { CreateTenantDto } from './dto/create-tenant.dto';
import {
  CreateTenantResponseDto,
  InviteSummaryDto,
  TenantSummaryDto,
} from './dto/tenant-response.dto';
import { SeedPersonasDto, SeedPersonasResponseDto } from './dto/seed-personas.dto';
import { TenantsService } from './tenants.service';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tenant + invite SCHOOL_ADMIN (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, type: CreateTenantResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantDto,
    @Req() req: Request,
  ): Promise<CreateTenantResponseDto> {
    return this.tenants.create(user.id, dto, getRequestMeta(req));
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, type: [TenantSummaryDto] })
  async list(): Promise<TenantSummaryDto[]> {
    return this.tenants.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by id (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, type: TenantSummaryDto })
  async getById(@Param('id') id: string): Promise<TenantSummaryDto> {
    return this.tenants.getById(id);
  }

  @Post(':id/personas')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Seed initial teacher/parent/staff accounts + invites (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, type: SeedPersonasResponseDto })
  async seedPersonas(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SeedPersonasDto,
    @Req() req: Request,
  ): Promise<SeedPersonasResponseDto> {
    return this.tenants.seedPersonas(user.id, id, dto, getRequestMeta(req));
  }

  @Post(':id/resend-invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Resend SCHOOL_ADMIN invite for an existing tenant (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, type: InviteSummaryDto })
  async resendInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<InviteSummaryDto> {
    return this.tenants.resendInvite(id, user.id, getRequestMeta(req));
  }
}
