import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import type { DashboardOverviewDto } from './dto/dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @Roles('SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STAFF')
  overview(@CurrentUser() user: AuthenticatedUser): Promise<DashboardOverviewDto> {
    return this.service.overview(user);
  }
}
