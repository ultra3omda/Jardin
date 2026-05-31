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
  CreateVaccinationDto,
  ListVaccinationsQueryDto,
  ListVaccinationsResponseDto,
  UpdateVaccinationDto,
  VaccinationResponseDto,
} from './dto/vaccination.dto';
import { VaccinationsService } from './vaccinations.service';

/**
 * T2b — Vaccinations.
 * RBAC : SCHOOL_ADMIN + STAFF (gèrent) · PARENT (lit ses enfants) · TEACHER (aucun accès).
 */
@ApiTags('vaccinations')
@ApiBearerAuth()
@Controller('vaccinations')
export class VaccinationsController {
  constructor(private readonly service: VaccinationsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List vaccinations (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListVaccinationsQueryDto,
  ): Promise<ListVaccinationsResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<VaccinationResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVaccinationDto,
  ): Promise<VaccinationResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVaccinationDto,
  ): Promise<VaccinationResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
