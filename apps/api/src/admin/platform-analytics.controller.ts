import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { AnalyticsDto, OverviewDto } from './dto/platform.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class PlatformAnalyticsController {
  constructor(private readonly platformAnalyticsService: PlatformAnalyticsService) {}

  @Get('overview')
  @ApiOkResponse({ type: OverviewDto })
  overview(): Promise<OverviewDto> {
    return this.platformAnalyticsService.overview();
  }

  @Get('analytics')
  @ApiOkResponse({ type: AnalyticsDto })
  analytics(): Promise<AnalyticsDto> {
    return this.platformAnalyticsService.analytics();
  }
}
