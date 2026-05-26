import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../auth/decorators/public.decorator';
import { getRequestMeta } from '../auth/utils/request-meta.utils';
import { DemoRequestDto } from './dto/demo-request.dto';
import { DemoRequestsService } from './demo-requests.service';

@ApiTags('public')
@Controller('public/demo-request')
@Public()
export class DemoRequestsController {
  constructor(private readonly service: DemoRequestsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  @ApiOperation({ summary: 'Submit a demo request (public landing form)' })
  @ApiResponse({ status: 200, description: '{ success, requestId }' })
  async submit(
    @Body() dto: DemoRequestDto,
    @Req() req: Request,
  ): Promise<{ success: true; requestId: string }> {
    return this.service.submit(dto, getRequestMeta(req));
  }
}
