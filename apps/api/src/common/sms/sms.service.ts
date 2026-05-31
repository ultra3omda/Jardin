import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsResult {
  success: boolean;
  /** true when no send was attempted (service disabled or no recipient). */
  skipped?: boolean;
  error?: string;
}

const SUCCESS_KEY = 'SMS_SENT_SUCCESSFULLY';

/**
 * GTM — Orange Tunisie SMS sender (BulkSmsAPI, unitary `sendSms`).
 * See docs/notifications/orange-sms.md.
 *
 * Hand-rolled REST client (mirrors ExpoPushService): keeps the API CJS-friendly,
 * single-message use only. Design rule (mirrors ResendService / ExpoPushService):
 * this service NEVER throws — SMS is a best-effort side-channel; a failure must
 * not cascade into the business flow. Disabled (skipped) when Orange creds are
 * unset, so the API boots and works without an SMS provider configured.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly bearerToken?: string;
  private readonly basicToken?: string;
  private readonly endpoint: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.bearerToken = this.config.get<string>('sms.bearerToken') || undefined;
    const email = this.config.get<string>('sms.email') || undefined;
    const password = this.config.get<string>('sms.password') || undefined;
    const host = this.config.get<string>('sms.host', 'inside.api.orange.tn');
    const path = this.config.get<string>(
      'sms.sendPath',
      '/BulkSmsAPI/1.0/campaigns/basicApi/sendSms',
    );
    this.endpoint = `https://${host}${path}`;
    this.basicToken =
      email && password ? Buffer.from(`${email}:${password}`).toString('base64') : undefined;
    this.enabled = Boolean(this.bearerToken && this.basicToken);
    if (!this.enabled) {
      this.logger.log(
        'SMS disabled — set ORANGE_SMS_BEARER_TOKEN/EMAIL/PASSWORD to enable Orange SMS.',
      );
    }
  }

  /**
   * Send a single SMS via Orange BulkSmsAPI. Non-blocking by contract — always
   * resolves, never rejects.
   * @param to Phone number, with or without the +216 country code.
   * @param body Message text (sms_content).
   */
  async send(to: string | null | undefined, body: string): Promise<SmsResult> {
    if (!this.enabled) return { success: false, skipped: true, error: 'SMS disabled' };
    if (!to) return { success: false, skipped: true, error: 'No recipient' };

    const contact = this.toE164(to);
    // undici cannot emit two distinct Authorization headers; Orange's reference
    // sends Bearer (gateway) + Basic (account) — concatenated here.
    const headers: Record<string, string> = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.bearerToken}, Basic ${this.basicToken}`,
    };

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ language: 'FR', sms_content: body, contacts: [contact] }),
      });
      if (res.status !== 200) {
        this.logger.error(`SMS failed to=${this.mask(contact)} HTTP ${res.status}`);
        return { success: false, error: `Orange SMS HTTP ${res.status}` };
      }
      const payload = (await res.json().catch(() => ({}))) as { key?: string; error?: unknown };
      const ok = (payload.key === undefined || payload.key === SUCCESS_KEY) && !payload.error;
      if (!ok) {
        this.logger.error(`SMS rejected to=${this.mask(contact)} key=${payload.key ?? '?'}`);
        return { success: false, error: String(payload.error ?? payload.key ?? 'Unknown') };
      }
      this.logger.log(`SMS sent to=${this.mask(contact)}`);
      return { success: true };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMS send failed to=${this.mask(contact)}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /** Normalise a TN number to +216 international format. */
  private toE164(raw: string): string {
    const trimmed = raw.trim().replace(/\s+/g, '');
    if (trimmed.startsWith('+')) return trimmed;
    const digits = trimmed.replace(/^0+/, '');
    return digits.startsWith('216') ? `+${digits}` : `+216${digits}`;
  }

  /** Redact a phone number for safe logging (PII — never log in full). */
  private mask(phone: string): string {
    return phone.length > 4 ? `••••${phone.slice(-4)}` : '••••';
  }
}
