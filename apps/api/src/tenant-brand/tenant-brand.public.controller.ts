import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { TenantBrandService } from './tenant-brand.service';

/**
 * Public unauthenticated endpoint for tenant branding lookup by slug.
 * Used by:
 *   - apps/web /t/[slug]/* layout (pre-auth pages, V1.6)
 *   - apps/mobile « code école » screen (V2+)
 *
 * Cached 5 min (CDN-friendly). Throttler global default applies for
 * rate-limiting.
 */
@ApiTags('public')
@Controller('public/tenant-brand')
export class TenantBrandPublicController {
  constructor(private readonly service: TenantBrandService) {}

  @Public()
  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60')
  @ApiOperation({
    summary: 'Public lookup of a tenant brand by slug (cached 5 min)',
  })
  @ApiResponse({ status: 200, description: 'Tenant name + merged brand' })
  @ApiResponse({ status: 404, description: 'Unknown or soft-deleted tenant' })
  async getBySlug(@Param('slug') slug: string) {
    const result = await this.service.findBySlug(slug);
    if (!result) {
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: 'École inconnue.',
      });
    }
    return result;
  }
}
