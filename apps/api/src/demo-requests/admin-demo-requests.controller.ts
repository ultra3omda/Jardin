import { Body, Controller, Get, HttpCode, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { DemoRequestsService } from './demo-requests.service';
import { DemoRequestAdminDto, UpdateDemoStatusDto } from './dto/demo-admin.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/demo-requests')
export class AdminDemoRequestsController {
  constructor(private readonly demoRequestsService: DemoRequestsService) {}

  @Get()
  @ApiOkResponse({ type: [DemoRequestAdminDto] })
  list(): Promise<DemoRequestAdminDto[]> {
    return this.demoRequestsService.listForAdmin();
  }

  @Patch(':requestId/status')
  @HttpCode(200)
  @ApiOkResponse({ type: DemoRequestAdminDto })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateDemoStatusDto,
    @Req() req: Request,
  ): Promise<DemoRequestAdminDto> {
    return this.demoRequestsService.updateStatus(user.id, requestId, dto, getRequestMeta(req));
  }
}
