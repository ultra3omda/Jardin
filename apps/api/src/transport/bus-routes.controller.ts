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
  BusRouteResponseDto,
  CreateBusRouteDto,
  CreateBusStopDto,
  ListBusRoutesResponseDto,
  UpdateBusRouteDto,
} from './dto/bus-route.dto';
import { BusRoutesService } from './bus-routes.service';

/**
 * T2b — Lignes de bus + arrêts (niveau école).
 * RBAC : SCHOOL_ADMIN + STAFF (gèrent) · PARENT (lecture) · TEACHER (aucun accès).
 */
@ApiTags('bus-routes')
@ApiBearerAuth()
@Controller('bus-routes')
export class BusRoutesController {
  constructor(private readonly service: BusRoutesService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List bus routes (with stops + assignment counts)' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListBusRoutesResponseDto> {
    return this.service.list(user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BusRouteResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusRouteDto,
  ): Promise<BusRouteResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusRouteDto,
  ): Promise<BusRouteResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }

  @Post(':id/stops')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  addStop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateBusStopDto,
  ): Promise<BusRouteResponseDto> {
    return this.service.addStop(id, dto, user);
  }

  @Delete(':id/stops/:stopId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  removeStop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('stopId') stopId: string,
  ): Promise<BusRouteResponseDto> {
    return this.service.removeStop(id, stopId, user);
  }
}
