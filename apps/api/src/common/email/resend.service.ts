import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import type { ReactElement } from 'react';

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: ReactElement;
  /** Optional override; defaults to EMAIL_FROM env var */
  from?: string;
}

export interface SendResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Thin wrapper around the Resend SDK. Renders @react-email JSX templates to
 * HTML + plaintext and ships them via the Resend HTTP API.
 *
 * Design rule: this service NEVER throws. Email-send failures must not
 * cascade into the auth flow (e.g. a user must still be able to register
 * even if our Resend account is rate-limited). Errors are logged via Pino
 * and returned in the `SendResult` so the caller can react if needed
 * (typically: ignore and continue).
 */
@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('email.resendApiKey', '');
    this.defaultFrom = this.config.get<string>('email.from', 'onboarding@resend.dev');
    this.client = new Resend(apiKey);
  }

  async send(opts: SendEmailOptions): Promise<SendResult> {
    const from = opts.from ?? this.defaultFrom;
    try {
      const [html, text] = await Promise.all([
        render(opts.template, { pretty: false }),
        render(opts.template, { plainText: true }),
      ]);
      const result = await this.client.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html,
        text,
      });
      if (result.error) {
        this.logger.warn(
          `Resend rejected email to=${opts.to} subject="${opts.subject}": ${result.error.message}`,
        );
        return { success: false, error: result.error.message };
      }
      this.logger.log(
        `Email sent id=${result.data?.id} to=${opts.to} subject="${opts.subject}"`,
      );
      return { success: true, id: result.data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Email send failed to=${opts.to} subject="${opts.subject}": ${message}`,
      );
      return { success: false, error: message };
    }
  }
}
