import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import { PrismaService } from '../prisma/prisma.service';

export interface ExpoPushResult {
  success: boolean;
  /** true when we deliberately did not attempt a send (no/invalid token) */
  skipped?: boolean;
  error?: string;
}

/**
 * V10 — Thin wrapper around the Expo Push SDK for mobile notifications.
 *
 * Design rule (mirrors {@link ResendService}): this service NEVER throws.
 * A failed push must not cascade into the business flow (sending a message
 * must still succeed even if the recipient's device token is stale). Errors
 * are logged via Pino and surfaced in {@link ExpoPushResult} for the caller
 * to react if needed (typically: ignore and continue).
 *
 * Self-healing: when Expo reports `DeviceNotRegistered` (app uninstalled or
 * token rotated) the stale token is cleared from the `users` table so we stop
 * trying to push to a dead device.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accessToken = this.config.get<string>('push.expoAccessToken') || undefined;
    this.expo = new Expo(accessToken ? { accessToken } : {});
  }

  /**
   * Send a single push notification. Non-blocking by contract — always
   * resolves, never rejects.
   *
   * @param token Expo push token (`ExponentPushToken[...]`) or null/undefined
   * @param title Notification title
   * @param body  Notification body
   * @param data  Optional data payload delivered to the app (e.g. deep link)
   */
  async send(
    token: string | null | undefined,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<ExpoPushResult> {
    if (!token) {
      return { success: false, skipped: true, error: 'No push token' };
    }

    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Invalid Expo push token format, clearing: ${this.mask(token)}`);
      await this.clearToken(token);
      return { success: false, skipped: true, error: 'Invalid token format' };
    }

    const message: ExpoPushMessage = {
      to: token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket && ticket.status === 'error') {
        const errorCode = ticket.details?.error;
        this.logger.warn(
          `Expo push rejected token=${this.mask(token)} error=${errorCode ?? ticket.message}`,
        );
        if (errorCode === 'DeviceNotRegistered') {
          await this.clearToken(token);
        }
        return { success: false, error: ticket.message };
      }

      this.logger.log(`Push sent token=${this.mask(token)} title="${title}"`);
      return { success: true };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Push send failed token=${this.mask(token)}: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Clear a stale/invalid token from every user that holds it. Tokens are
   * globally unique per physical device, so clearing by token value is safe
   * and tenant-agnostic (a dead device must stop receiving pushes everywhere).
   */
  private async clearToken(token: string): Promise<void> {
    try {
      await this.prisma.user.updateMany({
        where: { expoPushToken: token },
        data: { expoPushToken: null },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to clear invalid push token: ${errMsg}`);
    }
  }

  /** Redact a push token for safe logging (never log the full token). */
  private mask(token: string): string {
    return token.length > 18 ? `${token.slice(0, 18)}…` : token;
  }
}
