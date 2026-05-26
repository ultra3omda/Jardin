import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import * as React from 'react';

import type { RequestMeta } from '../auth/utils/request-meta.utils';
import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { DemoRequestEmail, demoRequestSubject } from '../common/email/templates/demo-request';
import type { DemoRequestDto } from './dto/demo-request.dto';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: DemoRequestDto, meta: RequestMeta = {}): Promise<{ success: true; requestId: string }> {
    await this.verifyTurnstile(dto.turnstileToken, meta.ip);

    const requestId = `dr_${createId()}`;
    const toEmail = this.config.get<string>('demoRequest.toEmail') ?? '';
    if (!toEmail) {
      this.logger.warn('DEMO_REQUEST_TO_EMAIL not configured — skipping email');
    } else {
      const subject = demoRequestSubject(dto.locale, dto.schoolName);
      const result = await this.resend.send({
        to: toEmail,
        subject,
        template: React.createElement(DemoRequestEmail, { ...dto, requestId }),
      });
      if (!result.success) {
        this.logger.error(`Resend failed for ${requestId}: ${String(result.error)}`);
      }
    }

    await this.prisma.auditLog
      .create({
        data: {
          id: createId(),
          action: 'demo.requested',
          resource: 'public',
          tenantId: null,
          userId: null,
          metadata: {
            requestId, email: dto.email, schoolName: dto.schoolName,
            studentsCount: dto.studentsCount, locale: dto.locale,
          },
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      })
      .catch((err: Error) => this.logger.error(`Audit log failed: ${err.message}`));

    this.logger.log(`Demo request: ${requestId} from ${dto.email}`);
    return { success: true, requestId };
  }

  private async verifyTurnstile(token: string, ip?: string): Promise<void> {
    const secret = this.config.get<string>('turnstile.secretKey');
    if (!secret) {
      this.logger.warn('TURNSTILE_SECRET_KEY not set — bypassing verify (DEV ONLY)');
      return;
    }
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
    if (!res.ok) throw new BadRequestException({ code: 'TURNSTILE_FAILED', message: 'Vérification anti-spam échouée.' });
    const data = (await res.json()) as SiteVerifyResponse;
    if (!data.success) {
      this.logger.warn(`Turnstile rejected: ${(data['error-codes'] ?? []).join(',')}`);
      throw new BadRequestException({ code: 'TURNSTILE_FAILED', message: 'Vérification anti-spam échouée.' });
    }
  }
}
