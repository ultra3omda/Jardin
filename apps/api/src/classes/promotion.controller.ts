import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PromoteDto } from './dto/promotion.dto';
import { PromotionService } from './promotion.service';

/** G7 — Passage de classe (SCHOOL_ADMIN). */
@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes/promote')
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  @Post('preview')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Prévisualise la promotion (sans écrire)' })
  preview(@CurrentUser() u: AuthenticatedUser, @Body() dto: PromoteDto) {
    return this.service.preview(u.tenantId!, dto);
  }

  @Post('commit')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Exécute la promotion (transactionnel + journalisé)' })
  commit(@CurrentUser() u: AuthenticatedUser, @Body() dto: PromoteDto) {
    return this.service.commit(u.tenantId!, u.id, dto);
  }
}
