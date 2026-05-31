import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  ORDER_STATUS_PAID,
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from './gateway/payment-gateway.interface';
import type {
  CheckoutResponseDto,
  PaymentReturnResponseDto,
  SubscriptionResponseDto,
} from './dto/payments.dto';

const CURRENCY_TND = '788';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /** SCHOOL_ADMIN/SUPER_ADMIN starts a subscription payment for their tenant. */
  /** Active subscription plans offered to schools. */
  async listPlans(): Promise<
    Array<{ code: string; name: string; interval: string; price: string; currency: string }>
  > {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    return plans.map((p) => ({
      code: p.code,
      name: p.name,
      interval: p.interval,
      price: p.price.toString(),
      currency: p.currency,
    }));
  }

  async checkout(planCode: string, user: AuthenticatedUser): Promise<CheckoutResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: planCode, active: true },
    });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND' });

    const orderNumber = `SUB${createId().slice(0, 24)}`; // ≤ 32 chars, unique
    const amountMillimes = Math.round(Number(plan.price) * 1000);
    if (amountMillimes < 1) throw new BadRequestException({ code: 'INVALID_AMOUNT' });

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        orderNumber,
        amount: plan.price,
        currency: plan.currency,
        status: 'PENDING',
      },
    });

    // Draft subscription holding the chosen plan, activated once paid.
    const sub = await this.prisma.tenantSubscription.create({
      data: { id: createId(), tenantId: user.tenantId, planId: plan.id, status: 'TRIALING' },
    });
    await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { subscriptionId: sub.id },
    });

    const webUrl = this.config.get<string>('webAppUrl', 'http://localhost:3000');
    const result = await this.gateway.createPayment({
      orderNumber,
      amountMillimes,
      currency: CURRENCY_TND,
      returnUrl: `${webUrl}/fr/billing?order=${orderNumber}`,
      failUrl: `${webUrl}/fr/billing?order=${orderNumber}&failed=1`,
      language: 'fr',
      description: `Abonnement ${plan.name}`,
    });

    await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { gatewayOrderId: result.gatewayOrderId },
    });

    return { orderNumber, redirectUrl: result.redirectUrl };
  }

  /** Browser return — re-verifies server-side (never trusts the redirect alone). */
  async handleReturn(orderNumber: string): Promise<PaymentReturnResponseDto> {
    const status = await this.verifyAndApply(orderNumber);
    return { orderNumber, status };
  }

  /**
   * ClicToPay S2S callback. Caller must 200 quickly; we verify via getStatus
   * (callback is a signal, not proof) and apply idempotently.
   */
  async handleCallback(orderNumber: string | undefined): Promise<void> {
    if (!orderNumber) return;
    await this.verifyAndApply(orderNumber).catch((e) =>
      this.logger.error(`callback verify failed for ${orderNumber}: ${String(e)}`),
    );
  }

  async mySubscription(user: AuthenticatedUser): Promise<SubscriptionResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const sub = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    if (!sub) return { id: null, planCode: null, status: null, currentPeriodEnd: null };
    return {
      id: sub.id,
      planCode: sub.plan.code,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    };
  }

  // -- internals -------------------------------------------------------------

  /** Verifies the transaction with the gateway and applies the outcome (idempotent). */
  private async verifyAndApply(orderNumber: string): Promise<string> {
    // Global lookup by unique orderNumber (callback/return are unauthenticated).
    const tx = await this.prisma.paymentTransaction.findUnique({ where: { orderNumber } });
    if (!tx) throw new NotFoundException({ code: 'TRANSACTION_NOT_FOUND' });
    if (tx.status === 'PAID') return 'PAID'; // idempotent

    const { orderStatus } = tx.gatewayOrderId
      ? await this.gateway.getStatus(tx.gatewayOrderId)
      : { orderStatus: -1 };

    if (orderStatus === ORDER_STATUS_PAID) {
      await this.prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: { status: 'PAID', gatewayStatus: orderStatus, paidAt: new Date() },
      });
      await this.activateSubscriptionForTransaction(tx.id);
      return 'PAID';
    }
    if (orderStatus === 6) {
      await this.prisma.paymentTransaction.update({
        where: { id: tx.id },
        data: { status: 'FAILED', gatewayStatus: orderStatus },
      });
      return 'FAILED';
    }
    return tx.status;
  }

  /** Marks the linked subscription ACTIVE and extends the period by the plan interval. */
  private async activateSubscriptionForTransaction(transactionId: string): Promise<void> {
    const tx = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!tx?.subscription) return;
    const now = new Date();
    const end = new Date(now);
    if (tx.subscription.plan.interval === 'YEARLY') end.setUTCFullYear(end.getUTCFullYear() + 1);
    else end.setUTCMonth(end.getUTCMonth() + 1);
    await this.prisma.tenantSubscription.update({
      where: { id: tx.subscription.id },
      data: { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: end },
    });
  }
}
