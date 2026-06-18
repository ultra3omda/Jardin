import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VercelDomainsClient {
  private readonly logger = new Logger(VercelDomainsClient.name);
  private readonly token: string;
  private readonly projectId: string;
  private readonly teamId: string;
  private readonly apiBase: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('domainAutomation.vercel.token', '');
    this.projectId = config.get<string>('domainAutomation.vercel.projectId', '');
    this.teamId = config.get<string>('domainAutomation.vercel.teamId', '');
    this.apiBase = config.get<string>('domainAutomation.vercel.apiBase', 'https://api.vercel.com');
  }

  private q(): string {
    return this.teamId ? `?teamId=${encodeURIComponent(this.teamId)}` : '';
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  /** Idempotent: 200/201 = added, 409 already-in-use = success. */
  async addDomain(name: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/v10/projects/${this.projectId}/domains${this.q()}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name }),
    });
    if (res.ok || res.status === 409) return;
    throw new Error(`Vercel addDomain ${name} → ${res.status}: ${await res.text()}`);
  }

  /** Ready = the project domain is verified AND DNS config is not misconfigured (SSL issuable). */
  async isReady(name: string): Promise<boolean> {
    const dRes = await fetch(
      `${this.apiBase}/v9/projects/${this.projectId}/domains/${encodeURIComponent(name)}${this.q()}`,
      { headers: this.headers() },
    );
    if (!dRes.ok) return false;
    const d = (await dRes.json()) as { verified?: boolean };
    if (!d.verified) return false;

    const cRes = await fetch(
      `${this.apiBase}/v6/domains/${encodeURIComponent(name)}/config${this.q()}`,
      { headers: this.headers() },
    );
    if (!cRes.ok) return false;
    const c = (await cRes.json()) as { misconfigured?: boolean };
    return c.misconfigured === false;
  }

  /** Idempotent: 404 = already removed = success. */
  async removeDomain(name: string): Promise<void> {
    const res = await fetch(
      `${this.apiBase}/v9/projects/${this.projectId}/domains/${encodeURIComponent(name)}${this.q()}`,
      { method: 'DELETE', headers: this.headers() },
    );
    if (res.ok || res.status === 404) return;
    throw new Error(`Vercel removeDomain ${name} → ${res.status}: ${await res.text()}`);
  }
}
