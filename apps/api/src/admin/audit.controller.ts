import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { AuditService } from './audit.service';
import { AuditListDto, AuditQueryDto } from './dto/audit.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOkResponse({ type: AuditListDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuditQueryDto,
    @Req() req: Request,
  ): Promise<AuditListDto> {
    return this.auditService.list(user.id, query, getRequestMeta(req));
  }
}
