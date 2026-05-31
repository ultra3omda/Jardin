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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSafetyDrillDto,
  ListSafetyDrillsResponseDto,
  SafetyDrillResponseDto,
  UpdateSafetyDrillDto,
} from './dto/safety-drill.dto';
import { SafetyDrillsService } from './safety-drills.service';

/**
 * T2b — Exercices de sécurité (niveau école).
 * RBAC : SCHOOL_ADMIN + STAFF. PARENT/TEACHER : aucun accès.
 */
@ApiTags('safety-drills')
@ApiBearerAuth()
@Controller('safety-drills')
export class SafetyDrillsController {
  constructor(private readonly service: SafetyDrillsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List safety drills' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListSafetyDrillsResponseDto> {
    return this.service.list(user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SafetyDrillResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSafetyDrillDto,
  ): Promise<SafetyDrillResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateSafetyDrillDto,
  ): Promise<SafetyDrillResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
