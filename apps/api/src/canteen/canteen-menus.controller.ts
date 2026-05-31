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
  CanteenMenuResponseDto,
  CreateCanteenMenuDto,
  ListCanteenMenusQueryDto,
  ListCanteenMenusResponseDto,
  UpdateCanteenMenuDto,
} from './dto/canteen-menu.dto';
import { CanteenMenusService } from './canteen-menus.service';

/**
 * T2b — Menus de cantine (niveau école).
 * RBAC : SCHOOL_ADMIN + STAFF (gèrent) · PARENT (lecture) · TEACHER (aucun accès).
 */
@ApiTags('canteen-menus')
@ApiBearerAuth()
@Controller('canteen-menus')
export class CanteenMenusController {
  constructor(private readonly service: CanteenMenusService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({ summary: 'List canteen menus (optional date range)' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCanteenMenusQueryDto,
  ): Promise<ListCanteenMenusResponseDto> {
    return this.service.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF, UserRole.PARENT)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CanteenMenuResponseDto> {
    return this.service.getById(id, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCanteenMenuDto,
  ): Promise<CanteenMenuResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCanteenMenuDto,
  ): Promise<CanteenMenuResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.STAFF)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
