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
  CreateDisciplineIncidentDto,
  DisciplineIncidentResponseDto,
  ListDisciplineQueryDto,
  ListDisciplineResponseDto,
  ResolveDisciplineIncidentDto,
  UpdateDisciplineIncidentDto,
} from './dto/discipline.dto';
import { DisciplineService } from './discipline.service';

/**
 * T2b — Incidents de discipline.
 * RBAC : SCHOOL_ADMIN (CRUD + résolution) · TEACHER (crée + lit) · PARENT (lit ses enfants).
 */
@ApiTags('discipline')
@ApiBearerAuth()
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly service: DisciplineService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ApiOperation({ summary: 'List discipline incidents (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDisciplineQueryDto,
  ): Promise<ListDisciplineResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDisciplineIncidentDto,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDisciplineIncidentDto,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Post(':id/resolve')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Mark an incident resolved (SCHOOL_ADMIN)' })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResolveDisciplineIncidentDto,
  ): Promise<DisciplineIncidentResponseDto> {
    return this.service.resolve(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
