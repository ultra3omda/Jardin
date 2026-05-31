import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaymentsService } from './payments.service';
import {
  CheckoutDto,
  CheckoutResponseDto,
  PaymentReturnResponseDto,
  SubscriptionResponseDto,
} from './dto/payments.dto';

/**
 * GTM — Abonnements & paiement ClicToPay.
 * RBAC : checkout / mySubscription = SCHOOL_ADMIN + SUPER_ADMIN.
 * return / callback = publics (re-vérifiés côté serveur via getOrderStatus).
 */
@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('payments/plans')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List active subscription plans' })
  listPlans() {
    return this.service.listPlans();
  }

  @Post('payments/checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Start a subscription payment → returns the gateway redirect URL' })
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CheckoutDto,
  ): Promise<CheckoutResponseDto> {
    return this.service.checkout(dto.planCode, user);
  }

  @Get('subscriptions/me')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Current tenant subscription state' })
  mySubscription(@CurrentUser() user: AuthenticatedUser): Promise<SubscriptionResponseDto> {
    return this.service.mySubscription(user);
  }

  @Public()
  @Get('payments/return')
  @ApiOperation({ summary: 'Browser return — re-verifies the payment server-side' })
  handleReturn(@Query('orderNumber') orderNumber: string): Promise<PaymentReturnResponseDto> {
    return this.service.handleReturn(orderNumber);
  }

  @Public()
  @Get('payments/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ClicToPay S2S callback (200 ack; verified via getOrderStatus)' })
  async handleCallback(@Query('orderNumber') orderNumber?: string): Promise<{ ok: true }> {
    // Acknowledge fast; verification + side-effects are best-effort.
    await this.service.handleCallback(orderNumber);
    return { ok: true };
  }
}
