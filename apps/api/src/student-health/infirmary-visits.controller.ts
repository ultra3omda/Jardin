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
import {
  CreateInfirmaryVisitDto,
  InfirmaryVisitResponseDto,
  ListInfirmaryVisitsQueryDto,
  ListInfirmaryVisitsResponseDto,
  UpdateInfirmaryVisitDto,
} from './dto/infirmary-visit.dto';
import { InfirmaryVisitsService } from './infirmary-visits.service';

/**
 * T2b — Passages à l'infirmerie.
 * RBAC : SCHOOL_ADMIN + STAFF (gèrent) · PARENT (lit ses enfants) · TEACHER (aucun accès).
 */
@ApiTags('infirmary-visits')
@ApiBearerAuth()
@Controller('infirmary-visits')
export class InfirmaryVisitsController {
  constructor(private readonly service: InfirmaryVisitsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List infirmary visits (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListInfirmaryVisitsQueryDto,
  ): Promise<ListInfirmaryVisitsResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<InfirmaryVisitResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInfirmaryVisitDto,
  ): Promise<InfirmaryVisitResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInfirmaryVisitDto,
  ): Promise<InfirmaryVisitResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
