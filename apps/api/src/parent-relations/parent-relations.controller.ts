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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateParentRelationDto,
  ListParentRelationsQueryDto,
  ListParentRelationsResponseDto,
  ParentRelationResponseDto,
  UpdateParentRelationDto,
} from './dto/parent-relation.dto';
import { ParentRelationsService } from './parent-relations.service';

/**
 * V3-A — Endpoints lien parent ↔ élève.
 *
 *  POST   /parent-relations             SCHOOL_ADMIN — Crée un lien
 *  GET    /parent-relations?studentId=  SCHOOL_ADMIN, TEACHER, STAFF, PARENT(self)
 *  PATCH  /parent-relations/:id         SCHOOL_ADMIN — Update partiel
 *  DELETE /parent-relations/:id         SCHOOL_ADMIN
 */
@ApiTags('parent-relations')
@ApiBearerAuth()
@Controller('parent-relations')
export class ParentRelationsController {
  constructor(private readonly service: ParentRelationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Lier un parent à un élève (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 201, type: ParentRelationResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateParentRelationDto,
  ): Promise<ParentRelationResponseDto> {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STAFF, UserRole.PARENT)
  @ApiOperation({
    summary: 'Lister les liens parent↔élève (filtré par studentId OU parentUserId)',
  })
  @ApiResponse({ status: 200, type: ListParentRelationsResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListParentRelationsQueryDto,
  ): Promise<ListParentRelationsResponseDto> {
    return this.service.list(query, user);
  }

  @Patch(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Modifier relationType ou isPrimaryContact (SCHOOL_ADMIN)' })
  @ApiResponse({ status: 200, type: ParentRelationResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateParentRelationDto,
  ): Promise<ParentRelationResponseDto> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Supprimer un lien parent↔élève (SCHOOL_ADMIN)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(id, user);
  }
}
