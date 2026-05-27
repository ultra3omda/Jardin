import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { DemoLoginService } from './demo-login.service';
import { DemoLoginDto } from './dto/demo-login.dto';

/** V7 — Demo login (1-click auto-login for showcased personas). */
@ApiTags('demo-login')
@Controller('auth/demo-login')
export class DemoLoginController {
  constructor(private readonly service: DemoLoginService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Auto-login a demo persona (rate-limited 60/h/IP)' })
  @ApiResponse({ status: 200, description: 'Session payload (user, tenant, tokens)' })
  async demoLogin(@Body() dto: DemoLoginDto, @Ip() ip: string) {
    return this.service.demoLogin(dto.persona, ip);
  }
}
