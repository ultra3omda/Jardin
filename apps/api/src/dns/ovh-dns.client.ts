import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  assertSafeSubdomain,
  DnsCnameRecord,
  DnsProvider,
} from './dns-provider.interface';
import { buildOvhSignature } from './ovh-signature';

const DEFAULT_TTL_SECONDS = 60;

interface OvhRecordPayload {
  id: number;
  subDomain: string;
  target: string;
  ttl: number;
}

@Injectable()
export class OvhDnsClient implements DnsProvider {
  private readonly logger = new Logger(OvhDnsClient.name);
  private readonly appKey: string;
  private readonly appSecret: string;
  private readonly consumerKey: string;
  private readonly apiBase: string;
  private readonly zone: string;

  /**
   * Cached numeric clock offset (server_sec - local_sec) once resolved.
   * Kept as `number | null` — never set to NaN.
   */
  private timeOffsetSec: number | null = null;

  /**
   * In-flight promise for the first /auth/time fetch.
   * Concurrent callers share the same promise instead of double-fetching.
   */
  private timeSync: Promise<number> | null = null;

  constructor(config: ConfigService) {
    this.appKey = config.get<string>('domainAutomation.ovh.appKey', '');
    this.appSecret = config.get<string>('domainAutomation.ovh.appSecret', '');
    this.consumerKey = config.get<string>('domainAutomation.ovh.consumerKey', '');
    this.apiBase = config.get<string>('domainAutomation.ovh.apiBase', 'https://eu.api.ovh.com/1.0');
    this.zone = config.get<string>('domainAutomation.dnsZone', 'klasso.tn');
  }

  async findCname(subDomain: string): Promise<DnsCnameRecord | null> {
    assertSafeSubdomain(subDomain);
    const ids = (await this.request(
      'GET',
      `/domain/zone/${this.zone}/record?fieldType=CNAME&subDomain=${encodeURIComponent(subDomain)}`,
    )) as number[];
    if (!ids?.length) return null;
    const rec = (await this.request(
      'GET',
      `/domain/zone/${this.zone}/record/${ids[0]}`,
    )) as OvhRecordPayload;
    return this.toRecord(rec);
  }

  async upsertCname(
    subDomain: string,
    target: string,
    ttl = DEFAULT_TTL_SECONDS,
  ): Promise<DnsCnameRecord> {
    assertSafeSubdomain(subDomain);
    const existing = await this.findCname(subDomain);
    if (existing && existing.target === target) return existing;

    // Use deleteById directly — no second findCname lookup.
    if (existing) await this.deleteById(existing.id);

    const created = (await this.request('POST', `/domain/zone/${this.zone}/record`, {
      fieldType: 'CNAME',
      subDomain,
      target,
      ttl,
    })) as OvhRecordPayload;
    await this.refresh();
    return this.toRecord(created);
  }

  async deleteCname(subDomain: string): Promise<void> {
    assertSafeSubdomain(subDomain);
    const existing = await this.findCname(subDomain);
    if (!existing) return;
    await this.deleteById(existing.id);
  }

  /** Delete a record by its numeric id and refresh the zone. */
  private async deleteById(id: string): Promise<void> {
    await this.request('DELETE', `/domain/zone/${this.zone}/record/${id}`);
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    await this.request('POST', `/domain/zone/${this.zone}/refresh`);
  }

  private toRecord(r: OvhRecordPayload): DnsCnameRecord {
    return { id: String(r.id), subDomain: r.subDomain, target: r.target, ttl: r.ttl };
  }

  /**
   * Returns the current OVH-aligned Unix timestamp.
   *
   * Single-flight: concurrent callers share one in-flight fetch.
   * Only caches a valid numeric offset — never caches NaN or error state.
   */
  private async serverTimestamp(): Promise<number> {
    if (this.timeOffsetSec !== null) {
      return Math.floor(Date.now() / 1000) + this.timeOffsetSec;
    }

    if (!this.timeSync) {
      this.timeSync = this.fetchTimeOffset().then(
        (offset) => {
          this.timeOffsetSec = offset;
          this.timeSync = null;
          return offset;
        },
        (err) => {
          // Clear the in-flight promise so the next call can retry.
          this.timeSync = null;
          throw err;
        },
      );
    }

    const offset = await this.timeSync;
    return Math.floor(Date.now() / 1000) + offset;
  }

  /** Fetches /auth/time and returns the validated clock offset. */
  private async fetchTimeOffset(): Promise<number> {
    const res = await fetch(`${this.apiBase}/auth/time`);
    if (!res.ok) {
      throw new Error(`OVH /auth/time HTTP ${res.status}`);
    }
    const body = await res.text();
    const serverSec = parseInt(body, 10);
    if (Number.isNaN(serverSec)) {
      throw new Error('OVH /auth/time returned non-numeric body');
    }
    return serverSec - Math.floor(Date.now() / 1000);
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const url = `${this.apiBase}${path}`;
    const bodyStr = body === undefined ? '' : JSON.stringify(body);
    const timestamp = await this.serverTimestamp();
    const signature = buildOvhSignature({
      appSecret: this.appSecret,
      consumerKey: this.consumerKey,
      method,
      url,
      body: bodyStr,
      timestamp,
    });
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': this.appKey,
        'X-Ovh-Consumer': this.consumerKey,
        'X-Ovh-Timestamp': String(timestamp),
        'X-Ovh-Signature': signature,
      },
      body: bodyStr === '' ? undefined : bodyStr,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OVH ${method} ${path} → ${res.status}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
}
