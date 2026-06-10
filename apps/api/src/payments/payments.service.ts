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
import { Prisma } from '@prisma/client';

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

/**
 * Order numbers we mint look like `SUB` + a 24-char cuid2 slice (lowercase
 * alphanumeric). The return + callback endpoints are public and take this as
 * an untrusted query param, so we validate the shape before any DB lookup or
 * gateway round-trip — this cheaply rejects probing/enumeration garbage.
 */
const ORDER_NUMBER_RE = /^SUB[0-9a-z]{24}$/;

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
    Array<{
      code: string;
      name: string;
      interval: string;
      price: string;
      currency: string;
      maxStudents: number | null;
    }>
  > {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    return plans.map((p) => ({
      code: p.code,
      name: p.name,
      interval: p.interval,
      price: p.price.toString(), // per-student TND
      currency: p.currency,
      maxStudents: p.maxStudents,
    }));
  }

  async checkout(planCode: string, user: AuthenticatedUser): Promise<CheckoutResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { code: planCode, active: true },
    });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND' });

    // Per-student billing: total = plan price × the tenant's active students.
    // student.count() is tenant-scoped automatically (the caller is a
    // SCHOOL_ADMIN inside their tenant context).
    const studentCount = await this.prisma.student.count({ where: { deletedAt: null } });
    if (studentCount < 1) {
      throw new BadRequestException({ code: 'NO_STUDENTS_TO_BILL' });
    }
    // Enforce the tier's student cap (maxStudents null = unlimited / Pro).
    if (plan.maxStudents !== null && studentCount > plan.maxStudents) {
      throw new BadRequestException({
        code: 'PLAN_STUDENT_LIMIT_EXCEEDED',
        message: `Ce palier est limité à ${plan.maxStudents} élèves (vous en avez ${studentCount}). Choisissez un palier supérieur.`,
      });
    }

    const orderNumber = `SUB${createId().slice(0, 24)}`; // ≤ 32 chars, unique
    const totalPrice = new Prisma.Decimal(plan.price).mul(studentCount);
    const amountMillimes = Math.round(Number(totalPrice) * 1000);
    if (amountMillimes < 1) throw new BadRequestException({ code: 'INVALID_AMOUNT' });

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        orderNumber,
        amount: totalPrice,
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

    return {
      orderNumber,
      redirectUrl: result.redirectUrl,
      studentCount,
      amount: totalPrice.toString(),
      currency: plan.currency,
    };
  }

  /** Browser return — re-verifies server-side (never trusts the redirect alone). */
  async handleReturn(orderNumber: string): Promise<PaymentReturnResponseDto> {
    if (!ORDER_NUMBER_RE.test(orderNumber ?? '')) {
      throw new BadRequestException({ code: 'INVALID_ORDER_NUMBER' });
    }
    const status = await this.verifyAndApply(orderNumber);
    return { orderNumber, status };
  }

  /**
   * ClicToPay S2S callback. Caller must 200 quickly; we verify via getStatus
   * (callback is a signal, not proof) and apply idempotently. ClicToPay's REST
   * callback carries no HMAC — the security boundary is the server-side
   * getStatus re-check below, which is why a forged callback cannot mark a
   * transaction PAID. We still validate the orderNumber shape and swallow the
   * outcome so probing never leaks state via the response.
   */
  async handleCallback(orderNumber: string | undefined): Promise<void> {
    if (!orderNumber || !ORDER_NUMBER_RE.test(orderNumber)) return;
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
