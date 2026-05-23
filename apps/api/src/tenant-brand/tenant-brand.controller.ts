import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateBrandingUploadUrlDto,
  UpdateBrandingDto,
} from './dto/update-branding.dto';
import { TenantBrandService } from './tenant-brand.service';

/**
 * Admin endpoints for tenant white-label branding (V1.6 D20).
 * SCHOOL_ADMIN and SUPER_ADMIN only. Each operation is implicitly scoped
 * to the caller's tenantId (extracted from JWT). Cross-tenant SUPER_ADMIN
 * panel is deferred to V11.
 */
@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin/tenant/branding')
export class TenantBrandController {
  constructor(private readonly service: TenantBrandService) {}

  @Get()
  @ApiOperation({ summary: 'Get current tenant branding (merged over DEFAULT_BRAND)' })
  @ApiResponse({ status: 200 })
  async get(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findByTenant(this.requireTenantId(user));
  }

  @Patch()
  @ApiOperation({ summary: 'Partial update of tenant branding' })
  @ApiResponse({ status: 200 })
  async patch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.service.update(this.requireTenantId(user), dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset tenant branding to DEFAULT_BRAND (indigo)' })
  @ApiResponse({ status: 200 })
  async reset(@CurrentUser() user: AuthenticatedUser) {
    return this.service.reset(this.requireTenantId(user));
  }

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a presigned R2 PUT URL for logo/favicon',
    description:
      'Client uploads the file directly to R2 via PUT to uploadUrl, then echoes finalUrl back via PATCH /branding.',
  })
  @ApiResponse({ status: 200 })
  async createUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBrandingUploadUrlDto,
  ) {
    return this.service.createUploadUrl(this.requireTenantId(user), dto);
  }

  // ===== Private =====

  /**
   * SUPER_ADMIN without a tenantId (the platform admin) shouldn't be hitting
   * these endpoints in V1.6 — cross-tenant admin panel is V11. Reject
   * explicitly with a clear error rather than throwing on tenantId=null
   * downstream.
   */
  private requireTenantId(user: AuthenticatedUser): string {
    if (!user.tenantId) {
      throw new BadRequestException({
        code: 'TENANT_CONTEXT_REQUIRED',
        message:
          'SUPER_ADMIN sans tenant ne peut pas éditer le branding via cet endpoint (V11).',
      });
    }
    return user.tenantId;
  }
}
