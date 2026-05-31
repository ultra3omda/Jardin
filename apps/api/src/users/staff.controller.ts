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
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import * as bcrypt from 'bcrypt';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateTeacherDto,
  UpdateTeacherDto,
  CreateParentDto,
  CreateStaffDto,
  UpdateStaffDto,
  StaffUserResponseDto,
  ListStaffResponseDto,
} from './dto/staff.dto';

@ApiTags('staff')
@ApiBearerAuth('access-token')
@Controller('users')
export class StaffController {
  constructor(private readonly prisma: PrismaService) {}

  // ── Teachers ──────────────────────────────────────────────────────────────

  @Get('teachers')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List teachers for the tenant (V9)' })
  async listTeachers(@CurrentUser() user: AuthenticatedUser): Promise<ListStaffResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const items = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, role: UserRole.TEACHER, deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return { items, total: items.length };
  }

  @Post('teachers')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a teacher account (V9)' })
  async createTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeacherDto,
  ): Promise<StaffUserResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `${dto.firstName.toLowerCase().replace(/\s/g, '')}${rand}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const created = await this.prisma.user.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.TEACHER,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return { ...created, tempPassword };
  }

  @Patch('teachers/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a teacher (V9)' })
  async updateTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ): Promise<StaffUserResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, role: UserRole.TEACHER },
    });
    if (!existing) throw new NotFoundException('Teacher not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.isActive === false && { deletedAt: new Date() }),
        ...(dto.isActive === true && { deletedAt: null }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return updated;
  }

  @Delete('teachers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a teacher (V9)' })
  async deleteTeacher(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, role: UserRole.TEACHER },
    });
    if (!existing) throw new NotFoundException('Teacher not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Staff (T2c V1) ──────────────────────────────────────────────────────────

  @Get('staff')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List staff (non-teaching employees) for the tenant (T2c)' })
  async listStaff(@CurrentUser() user: AuthenticatedUser): Promise<ListStaffResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const items = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, role: UserRole.STAFF, deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return { items, total: items.length };
  }

  @Post('staff')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a staff account (T2c)' })
  async createStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffUserResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `${dto.firstName.toLowerCase().replace(/\s/g, '')}${rand}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const created = await this.prisma.user.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.STAFF,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return { ...created, tempPassword };
  }

  @Patch('staff/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a staff member (T2c)' })
  async updateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffUserResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, role: UserRole.STAFF },
    });
    if (!existing) throw new NotFoundException('Staff member not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.isActive === false && { deletedAt: new Date() }),
        ...(dto.isActive === true && { deletedAt: null }),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return updated;
  }

  @Delete('staff/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a staff member (T2c)' })
  async deleteStaff(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: user.tenantId, role: UserRole.STAFF },
    });
    if (!existing) throw new NotFoundException('Staff member not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Parents ───────────────────────────────────────────────────────────────

  @Get('parents')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List parent accounts for the tenant (V9)' })
  async listParents(@CurrentUser() user: AuthenticatedUser): Promise<ListStaffResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const items = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId, role: UserRole.PARENT, deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return { items, total: items.length };
  }

  @Post('parents')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a parent account (V9)' })
  async createParent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateParentDto,
  ): Promise<StaffUserResponseDto> {
    if (!user.tenantId) throw new ForbiddenException('TENANT_REQUIRED');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `${dto.firstName.toLowerCase().replace(/\s/g, '')}${rand}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const created = await this.prisma.user.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.PARENT,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, deletedAt: true },
    });
    return { ...created, tempPassword };
  }
}
