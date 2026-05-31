/**
 * GTM — Payment gateway port. Adapters: ClicToPayGateway (real), MockGateway (tests/dev).
 * Amounts are passed in the smallest currency unit (TND = millimes → Decimal × 1000).
 */
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface CreatePaymentParams {
  /** Unique merchant-side order id (idempotency). */
  orderNumber: string;
  amountMillimes: number;
  /** ISO 4217 numeric, e.g. '788' for TND. */
  currency: string;
  returnUrl: string;
  failUrl?: string;
  language?: string;
  description?: string;
}

export interface CreatePaymentResult {
  /** ClicToPay orderId (mdOrder). */
  gatewayOrderId: string;
  /** Hosted payment page URL to redirect the customer to. */
  redirectUrl: string;
}

export interface GatewayStatus {
  /** ClicToPay OrderStatus: 2 = paid. */
  orderStatus: number;
  raw: unknown;
}

export interface PaymentGateway {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  getStatus(gatewayOrderId: string): Promise<GatewayStatus>;
}

/** OrderStatus value meaning "paid with success" (ClicToPay). */
export const ORDER_STATUS_PAID = 2;
