import { Injectable, Logger } from '@nestjs/common';

import type {
  CreatePaymentParams,
  CreatePaymentResult,
  GatewayStatus,
  PaymentGateway,
} from './payment-gateway.interface';

/**
 * ClicToPay (Monétique Tunisie) REST adapter.
 * See docs/payments/clictopay-integration.md. Auth via userName/password on
 * each request (no token). Amounts in millimes (TND), currency 788.
 */
@Injectable()
export class ClicToPayGateway implements PaymentGateway {
  private readonly logger = new Logger(ClicToPayGateway.name);
  private readonly baseUrl = process.env.CLICTOPAY_BASE_URL ?? 'https://test.clictopay.com/rest';
  private readonly userName = process.env.CLICTOPAY_USER ?? '';
  private readonly password = process.env.CLICTOPAY_PWD ?? '';

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const body = new URLSearchParams({
      userName: this.userName,
      password: this.password,
      orderNumber: params.orderNumber,
      amount: String(params.amountMillimes),
      currency: params.currency,
      returnUrl: params.returnUrl,
    });
    if (params.failUrl) body.set('failUrl', params.failUrl);
    if (params.language) body.set('language', params.language);
    if (params.description) body.set('description', params.description);

    const json = await this.post('/register.do', body);
    if (json.errorCode && Number(json.errorCode) !== 0) {
      throw new Error(`ClicToPay register failed: ${json.errorCode} ${json.errorMessage ?? ''}`);
    }
    if (!json.orderId || !json.formUrl) {
      throw new Error('ClicToPay register returned no orderId/formUrl');
    }
    return { gatewayOrderId: String(json.orderId), redirectUrl: String(json.formUrl) };
  }

  async getStatus(gatewayOrderId: string): Promise<GatewayStatus> {
    const body = new URLSearchParams({
      userName: this.userName,
      password: this.password,
      orderId: gatewayOrderId,
    });
    const json = await this.post('/getOrderStatus.do', body);
    // OrderStatus is the authoritative field (authCode is deprecated).
    const orderStatus = Number(json.OrderStatus ?? json.orderStatus ?? -1);
    return { orderStatus, raw: json };
  }

  private async post(path: string, body: URLSearchParams): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`ClicToPay ${path} HTTP ${res.status}`);
    }
    return (await res.json()) as Record<string, unknown>;
  }
}
