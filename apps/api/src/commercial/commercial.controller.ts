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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { CommercialService } from './commercial.service';
import {
  CommercialAgentDto,
  CreateOrganizationResponseDto,
  OrganizationSummaryDto,
} from './dto/commercial-response.dto';
import { ContractUploadUrlDto, ContractUploadUrlResponseDto } from './dto/contract-upload-url.dto';
import { CreateCommercialAgentDto } from './dto/create-commercial-agent.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@ApiTags('commercial')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.COMMERCIAL)
@Controller('commercial')
export class CommercialController {
  constructor(private readonly commercial: CommercialService) {}

  @Post('contracts/upload-url')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mint a presigned R2 URL to upload a signed contract PDF' })
  @ApiResponse({ status: 201, type: ContractUploadUrlResponseDto })
  async uploadUrl(@Body() dto: ContractUploadUrlDto): Promise<ContractUploadUrlResponseDto> {
    return this.commercial.createContractUploadUrl(dto.fileName, dto.contentType);
  }

  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a signed organization + contract + invite its admin' })
  @ApiResponse({ status: 201, type: CreateOrganizationResponseDto })
  async createOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
    @Req() req: Request,
  ): Promise<CreateOrganizationResponseDto> {
    return this.commercial.createOrganization(user.id, dto, getRequestMeta(req));
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations (own for COMMERCIAL, all for SUPER_ADMIN)' })
  @ApiResponse({ status: 200, type: [OrganizationSummaryDto] })
  async listOrganizations(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationSummaryDto[]> {
    return this.commercial.listOrganizations(user.id, user.role);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get a single organization summary' })
  @ApiResponse({ status: 200, type: OrganizationSummaryDto })
  async getOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrganizationSummaryDto> {
    return this.commercial.getOrganization(id, user.id, user.role);
  }

  @Get('organizations/:id/contract')
  @ApiOperation({ summary: 'Get a signed download URL for the latest contract PDF' })
  @ApiResponse({ status: 200 })
  async contract(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ url: string; fileName: string }> {
    return this.commercial.getContractDownloadUrl(id, user.id, user.role);
  }

  // ===== Commercial agents (SUPER_ADMIN only) =====

  @Post('agents')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a COMMERCIAL sub-admin (SUPER_ADMIN only)' })
  @ApiResponse({ status: 201, type: CommercialAgentDto })
  async createAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommercialAgentDto,
    @Req() req: Request,
  ): Promise<CommercialAgentDto> {
    return this.commercial.createAgent(user.id, dto, getRequestMeta(req));
  }

  @Get('agents')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List COMMERCIAL sub-admins (SUPER_ADMIN only)' })
  @ApiResponse({ status: 200, type: [CommercialAgentDto] })
  async listAgents(): Promise<CommercialAgentDto[]> {
    return this.commercial.listAgents();
  }
}
