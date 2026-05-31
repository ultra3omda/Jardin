import { Injectable } from '@nestjs/common';

import { ORDER_STATUS_PAID } from './payment-gateway.interface';
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  GatewayStatus,
  PaymentGateway,
} from './payment-gateway.interface';

/**
 * Deterministic in-memory gateway for dev/tests (no network). Mirrors the
 * ClicToPay contract: paid unless the orderNumber contains "fail" (→ status 6).
 */
@Injectable()
export class MockGateway implements PaymentGateway {
  private readonly orders = new Map<string, { orderNumber: string }>();

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const gatewayOrderId = `mock_${params.orderNumber}`;
    this.orders.set(gatewayOrderId, { orderNumber: params.orderNumber });
    const sep = params.returnUrl.includes('?') ? '&' : '?';
    return {
      gatewayOrderId,
      redirectUrl: `${params.returnUrl}${sep}mock=1&orderNumber=${encodeURIComponent(params.orderNumber)}`,
    };
  }

  async getStatus(gatewayOrderId: string): Promise<GatewayStatus> {
    const order = this.orders.get(gatewayOrderId);
    const failed = order?.orderNumber.toLowerCase().includes('fail');
    return { orderStatus: failed ? 6 : ORDER_STATUS_PAID, raw: { mock: true, gatewayOrderId } };
  }
}
