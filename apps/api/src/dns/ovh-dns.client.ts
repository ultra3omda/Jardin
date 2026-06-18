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
  private timeOffsetSec: number | null = null;

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
    if (existing) await this.deleteCname(subDomain);

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
    await this.request('DELETE', `/domain/zone/${this.zone}/record/${existing.id}`);
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    await this.request('POST', `/domain/zone/${this.zone}/refresh`);
  }

  private toRecord(r: OvhRecordPayload): DnsCnameRecord {
    return { id: String(r.id), subDomain: r.subDomain, target: r.target, ttl: r.ttl };
  }

  private async serverTimestamp(): Promise<number> {
    if (this.timeOffsetSec === null) {
      const res = await fetch(`${this.apiBase}/auth/time`);
      const serverSec = parseInt(await res.text(), 10);
      this.timeOffsetSec = serverSec - Math.floor(Date.now() / 1000);
    }
    return Math.floor(Date.now() / 1000) + this.timeOffsetSec;
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
