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
  CreateTransportAssignmentDto,
  ListTransportAssignmentsQueryDto,
  ListTransportAssignmentsResponseDto,
  TransportAssignmentResponseDto,
  UpdateTransportAssignmentDto,
} from './dto/transport-assignment.dto';
import { TransportAssignmentsService } from './transport-assignments.service';

/**
 * T2b — Affectations transport (élève ↔ ligne).
 * RBAC : SCHOOL_ADMIN + STAFF (gèrent) · PARENT (lit ses enfants) · TEACHER (aucun accès).
 */
@ApiTags('transport-assignments')
@ApiBearerAuth()
@Controller('transport-assignments')
export class TransportAssignmentsController {
  constructor(private readonly service: TransportAssignmentsService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List transport assignments (parent → own children only)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTransportAssignmentsQueryDto,
  ): Promise<ListTransportAssignmentsResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<TransportAssignmentResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransportAssignmentDto,
  ): Promise<TransportAssignmentResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransportAssignmentDto,
  ): Promise<TransportAssignmentResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
