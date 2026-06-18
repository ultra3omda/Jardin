# Tenant Domain Automation (OVH + Vercel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** À la création d'une école, provisionner automatiquement `https://<slug>.klasso.tn` (CNAME OVH + domaine Vercel + SSL) puis envoyer l'invitation, une fois le domaine actif, vers l'URL brandée du tenant.

**Architecture:** Clients DNS sans dépendance (OVH signé maison + Vercel via fetch natif) derrière une interface `DnsProvider`. Un `DomainProvisioningService` orchestre en arrière-plan (détaché de la transaction de requête) : OVH → Vercel → poll SSL → email. Suivi d'état sur `Tenant.domainStatus`. Tout est gated par `ENABLE_TENANT_DOMAIN_AUTOMATION` (off ⇒ flux actuel inchangé). Le code web sous-domaine (CORS wildcard, CSP, middleware sélectif) **existe déjà** : il suffit d'activer les flags d'env.

**Tech Stack:** NestJS 10 · Prisma 5 · `fetch` natif (Node 20) · `node:crypto` (SHA1 OVH) · Vitest · API OVH `/domain/zone` · API Vercel `/v10|/v9|/v6`.

## Global Constraints

- TypeScript **strict** : pas de `any`, pas de `@ts-ignore`. (CLAUDE.md)
- **Zéro nouvelle dépendance** : `fetch` natif + `node:crypto` uniquement. (DA5)
- Fichiers < 300 lignes, fonctions < 50 lignes. (CLAUDE.md)
- Pas de magic numbers/strings : constantes nommées.
- Secrets en env vars uniquement, **jamais loggés** (redaction Pino), jamais dans une réponse API ni l'audit metadata.
- **Isolation = JWT `tenantId`, source UNIQUE** : aucune lecture du `Host` pour l'autorisation (invariant D3).
- **Garde-fou DNS (DA9)** : ne jamais créer/supprimer autre chose qu'un `CNAME` dont `subDomain` == slug validé. Jamais MX/TXT/apex/`@`.
- Commits : Conventional Commits (`feat:`, `test:`, `chore:`…). Attribution désactivée (settings globaux).
- Build/test natifs cassés en local Windows (`ERR_DLOPEN_FAILED`) → local : `pnpm --filter=@ecole-saas/api type-check` + `lint` ; suite complète (vitest/build/e2e) en **CI**.
- Branche de travail : `feat/tenant-domain-automation` (déjà créée, spec committée).
- CNAME cible : `cname.vercel-dns.com.` (avec point final, format OVH).
- Spec de référence : `docs/superpowers/specs/2026-06-18-tenant-domain-automation-ovh-design.md`.

---

## File Structure

**PR-1 — Clients DNS (briques pures, aucun branchement)**
- Create `apps/api/src/dns/dns-provider.interface.ts` — interface `DnsProvider` + types + token DI `DNS_PROVIDER` + `DnsGuardError` + helper `assertSafeSubdomain`.
- Create `apps/api/src/dns/dns-provider.guard.spec.ts` — tests du garde-fou.
- Create `apps/api/src/dns/ovh-signature.ts` — signature OVH (`buildOvhSignature`) pure et testable.
- Create `apps/api/src/dns/ovh-signature.spec.ts` — vecteur de signature connu.
- Create `apps/api/src/dns/ovh-dns.client.ts` — `OvhDnsClient implements DnsProvider`.
- Create `apps/api/src/dns/ovh-dns.client.spec.ts` — tests (fetch mocké).
- Create `apps/api/src/dns/vercel-domains.client.ts` — `VercelDomainsClient`.
- Create `apps/api/src/dns/vercel-domains.client.spec.ts` — tests (fetch mocké).
- Create `apps/api/src/dns/dns.module.ts` — provider `DNS_PROVIDER` → `OvhDnsClient` + `VercelDomainsClient`, exportés.

**PR-2 — Provisioning (schéma + service + branchement)**
- Modify `apps/api/prisma/schema.prisma` — enum `DomainStatus` + 4 champs sur `Tenant`.
- Create `apps/api/prisma/migrations/<ts>_add_tenant_domain_status/migration.sql` (généré).
- Modify `apps/api/src/common/config/configuration.ts` — bloc `domainAutomation`.
- Modify `apps/api/src/common/config/env.validation.ts` — fail-fast si flag on + env manquantes.
- Create `apps/api/src/admin/domain-provisioning.service.ts` — orchestration/poll/deprovision/reconcile.
- Create `apps/api/src/admin/domain-provisioning.service.spec.ts` — machine à états (clients mockés).
- Modify `apps/api/src/admin/invite-tokens.service.ts` — param optionnel `baseUrlOverride`.
- Modify `apps/api/src/admin/tenants.service.ts` — flag, PROVISIONING, trigger détaché, email différé.
- Modify `apps/api/src/admin/dto/tenant-response.dto.ts` — `invite` nullable + `domainStatus`/`customDomain`.
- Modify `apps/api/src/admin/tenants.controller.ts` — endpoint `POST :id/domain/retry`.
- Modify `apps/api/src/admin/admin.module.ts` — import `DnsModule` + provider `DomainProvisioningService` + `OnApplicationBootstrap`.
- Modify `apps/api/test/admin-tenants.e2e-spec.ts` — flux flag on/off, ACTIVE/FAILED, retry, reconcile.
- Modify `apps/api/test/multi-tenant-isolation.e2e-spec.ts` — régression `Host` spoofé (R10).

**PR-3 — Activation web (ops + vérif, code déjà présent)**
- Verify `apps/web/next.config.mjs` (CSP déjà OK), `apps/api/src/common/config/cors-origin.ts` (déjà OK), `apps/web/middleware.ts` (déjà OK).
- Ops : env Vercel `ENABLE_SUBDOMAIN_RESOLVER=true`, `NEXT_PUBLIC_BASE_DOMAIN=klasso.tn`, `NEXT_PUBLIC_ENABLE_SUBDOMAIN=true`.

**UI**
- Modify `apps/web/app/[locale]/(app)/platform/tenants/[id]/...` — badge `domainStatus` + bouton retry.

**Runbook**
- Create `docs/superpowers/runbooks/2026-06-18-tenant-domain-provisioning.md`.

---

# PR-1 — Clients DNS

### Task 1: Interface `DnsProvider` + garde-fou sous-domaine

**Files:**
- Create: `apps/api/src/dns/dns-provider.interface.ts`
- Test: `apps/api/src/dns/dns-provider.guard.spec.ts`

**Interfaces:**
- Produces: `DnsProvider` (`findCname`, `upsertCname`, `deleteCname`), `DnsCnameRecord`, `DNS_PROVIDER` (token DI), `DnsGuardError`, `assertSafeSubdomain(sub: string): void`, `DNS_RESERVED_SUBDOMAINS`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/dns/dns-provider.guard.spec.ts
import { describe, it, expect } from 'vitest';
import { assertSafeSubdomain, DnsGuardError } from './dns-provider.interface';

describe('assertSafeSubdomain', () => {
  it('accepts a valid tenant slug', () => {
    expect(() => assertSafeSubdomain('ecole-victor-hugo')).not.toThrow();
  });

  it('rejects email/system labels (protects OVH MX)', () => {
    for (const s of ['mail', 'mx', 'smtp', 'imap', 'autodiscover', 'autoconfig', '_dmarc', '_domainkey', 'ns1', 'ns2', 'www', '@']) {
      expect(() => assertSafeSubdomain(s)).toThrow(DnsGuardError);
    }
  });

  it('rejects malformed labels', () => {
    for (const s of ['', 'UPPER', 'a.b', 'has space', '-leading', 'trailing-']) {
      expect(() => assertSafeSubdomain(s)).toThrow(DnsGuardError);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/dns-provider.guard.spec.ts`
Expected: FAIL — `Cannot find module './dns-provider.interface'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/dns/dns-provider.interface.ts

/** DI token for the active DnsProvider implementation. */
export const DNS_PROVIDER = Symbol('DNS_PROVIDER');

export interface DnsCnameRecord {
  id: string;
  subDomain: string;
  target: string;
  ttl: number;
}

export interface DnsProvider {
  findCname(subDomain: string): Promise<DnsCnameRecord | null>;
  upsertCname(subDomain: string, target: string, ttl?: number): Promise<DnsCnameRecord>;
  deleteCname(subDomain: string): Promise<void>;
}

/** Thrown when an operation would touch a record outside the safe CNAME-per-tenant scope. */
export class DnsGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DnsGuardError';
  }
}

/**
 * Labels we must NEVER create/delete as a tenant subdomain: they map to email
 * (MX/autodiscover/DKIM/DMARC), nameservers, or reserved app hosts. Defense in
 * depth on top of the least-privilege OVH consumer key (DA9).
 */
export const DNS_RESERVED_SUBDOMAINS = new Set<string>([
  '@', 'www', 'mail', 'mx', 'smtp', 'imap', 'pop', 'webmail',
  'autodiscover', 'autoconfig', '_dmarc', '_domainkey', 'dkim',
  'ns1', 'ns2', 'api', 'admin', 'app', 'assets', 'docs', 'status', 'support', 'dashboard',
]);

const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Guard: a subdomain must be a single safe DNS label and never a reserved/email host. */
export function assertSafeSubdomain(sub: string): void {
  if (DNS_RESERVED_SUBDOMAINS.has(sub)) {
    throw new DnsGuardError(`Refused: "${sub}" is a reserved/system subdomain.`);
  }
  if (!SUBDOMAIN_RE.test(sub)) {
    throw new DnsGuardError(`Refused: "${sub}" is not a valid single DNS label.`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/dns-provider.guard.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dns/dns-provider.interface.ts apps/api/src/dns/dns-provider.guard.spec.ts
git commit -m "feat(api): DnsProvider interface + subdomain safety guard"
```

---

### Task 2: Signature OVH

**Files:**
- Create: `apps/api/src/dns/ovh-signature.ts`
- Test: `apps/api/src/dns/ovh-signature.spec.ts`

**Interfaces:**
- Produces: `buildOvhSignature(params: { appSecret: string; consumerKey: string; method: string; url: string; body: string; timestamp: number }): string` → `"$1$" + sha1hex(...)`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/dns/ovh-signature.spec.ts
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { buildOvhSignature } from './ovh-signature';

describe('buildOvhSignature', () => {
  it('matches the OVH "$1$" + SHA1 of joined fields', () => {
    const p = {
      appSecret: 'secret', consumerKey: 'consumer',
      method: 'POST', url: 'https://eu.api.ovh.com/1.0/domain/zone/klasso.tn/record',
      body: '{"fieldType":"CNAME"}', timestamp: 1700000000,
    };
    const expected =
      '$1$' +
      createHash('sha1')
        .update([p.appSecret, p.consumerKey, p.method, p.url, p.body, p.timestamp].join('+'))
        .digest('hex');
    expect(buildOvhSignature(p)).toBe(expected);
  });

  it('produces a distinct signature when the body changes', () => {
    const base = { appSecret: 's', consumerKey: 'c', method: 'GET', url: 'u', timestamp: 1 };
    expect(buildOvhSignature({ ...base, body: 'a' })).not.toBe(buildOvhSignature({ ...base, body: 'b' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/ovh-signature.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/dns/ovh-signature.ts
import { createHash } from 'node:crypto';

export interface OvhSignatureParams {
  appSecret: string;
  consumerKey: string;
  method: string;
  url: string;
  body: string;
  timestamp: number;
}

/**
 * OVH API request signature.
 * `"$1$" + sha1_hex(appSecret + "+" + consumerKey + "+" + METHOD + "+" + URL + "+" + body + "+" + timestamp)`.
 * https://docs.ovh.com/gb/en/api/api-arguments-basics/
 */
export function buildOvhSignature(p: OvhSignatureParams): string {
  const toSign = [p.appSecret, p.consumerKey, p.method, p.url, p.body, p.timestamp].join('+');
  return '$1$' + createHash('sha1').update(toSign).digest('hex');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/ovh-signature.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dns/ovh-signature.ts apps/api/src/dns/ovh-signature.spec.ts
git commit -m "feat(api): OVH API request signature helper"
```

---

### Task 3: `OvhDnsClient`

**Files:**
- Create: `apps/api/src/dns/ovh-dns.client.ts`
- Test: `apps/api/src/dns/ovh-dns.client.spec.ts`

**Interfaces:**
- Consumes: `DnsProvider`, `DnsCnameRecord`, `assertSafeSubdomain`, `DnsGuardError` (Task 1) ; `buildOvhSignature` (Task 2) ; `ConfigService`.
- Produces: `OvhDnsClient implements DnsProvider` (constructor `(config: ConfigService)`). Reads config keys: `domainAutomation.ovh.{appKey,appSecret,consumerKey,apiBase}`, `domainAutomation.dnsZone`.

> The OVH timestamp is taken from the server clock via `GET {apiBase}/auth/time` once, then offset locally, to avoid clock-drift signature rejection.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/dns/ovh-dns.client.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OvhDnsClient } from './ovh-dns.client';
import { DnsGuardError } from './dns-provider.interface';

function makeConfig() {
  return {
    get: (key: string) => ({
      'domainAutomation.ovh.appKey': 'ak',
      'domainAutomation.ovh.appSecret': 'as',
      'domainAutomation.ovh.consumerKey': 'ck',
      'domainAutomation.ovh.apiBase': 'https://eu.api.ovh.com/1.0',
      'domainAutomation.dnsZone': 'klasso.tn',
    }[key]),
  } as any;
}

describe('OvhDnsClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('refuses to create a record for a reserved subdomain (no network call)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = new OvhDnsClient(makeConfig());
    await expect(client.upsertCname('mail', 'cname.vercel-dns.com.')).rejects.toBeInstanceOf(DnsGuardError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('creates a CNAME then refreshes the zone when none exists', async () => {
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/auth/time')) return new Response('1700000000');
      if (url.includes('/record?')) return new Response('[]'); // findCname → none
      if (url.endsWith('/record')) return new Response(JSON.stringify({ id: 42, subDomain: 'ecole', target: 'cname.vercel-dns.com.', ttl: 60 }));
      if (url.endsWith('/refresh')) return new Response('null');
      throw new Error(`unexpected ${url}`);
    });
    const client = new OvhDnsClient(makeConfig());
    const rec = await client.upsertCname('ecole', 'cname.vercel-dns.com.');
    expect(rec.id).toBe('42');
    expect(calls.some((c) => c.startsWith('POST') && c.endsWith('/record'))).toBe(true);
    expect(calls.some((c) => c.endsWith('/refresh'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/ovh-dns.client.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/dns/ovh-dns.client.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/ovh-dns.client.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dns/ovh-dns.client.ts apps/api/src/dns/ovh-dns.client.spec.ts
git commit -m "feat(api): OvhDnsClient (CNAME upsert/delete + zone refresh, guarded)"
```

---

### Task 4: `VercelDomainsClient`

**Files:**
- Create: `apps/api/src/dns/vercel-domains.client.ts`
- Test: `apps/api/src/dns/vercel-domains.client.spec.ts`

**Interfaces:**
- Consumes: `ConfigService`. Reads `domainAutomation.vercel.{token,projectId,teamId,apiBase}`.
- Produces: `VercelDomainsClient` with `addDomain(name: string): Promise<void>`, `isReady(name: string): Promise<boolean>`, `removeDomain(name: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/dns/vercel-domains.client.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelDomainsClient } from './vercel-domains.client';

function makeConfig() {
  return {
    get: (key: string) => ({
      'domainAutomation.vercel.token': 'tok',
      'domainAutomation.vercel.projectId': 'prj_1',
      'domainAutomation.vercel.teamId': 'team_1',
      'domainAutomation.vercel.apiBase': 'https://api.vercel.com',
    }[key]),
  } as any;
}

describe('VercelDomainsClient', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('treats an already-added domain (409) as success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'domain_already_in_use' } }), { status: 409 }),
    );
    const client = new VercelDomainsClient(makeConfig());
    await expect(client.addDomain('ecole.klasso.tn')).resolves.toBeUndefined();
  });

  it('isReady true only when verified && !misconfigured', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/v9/projects/')) return new Response(JSON.stringify({ verified: true }));
      if (url.includes('/v6/domains/')) return new Response(JSON.stringify({ misconfigured: false }));
      throw new Error(`unexpected ${url}`);
    });
    const client = new VercelDomainsClient(makeConfig());
    expect(await client.isReady('ecole.klasso.tn')).toBe(true);
  });

  it('isReady false when misconfigured', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/v9/projects/')) return new Response(JSON.stringify({ verified: true }));
      return new Response(JSON.stringify({ misconfigured: true }));
    });
    const client = new VercelDomainsClient(makeConfig());
    expect(await client.isReady('ecole.klasso.tn')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/vercel-domains.client.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/dns/vercel-domains.client.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/dns/vercel-domains.client.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/dns/vercel-domains.client.ts apps/api/src/dns/vercel-domains.client.spec.ts
git commit -m "feat(api): VercelDomainsClient (add/isReady/remove, idempotent)"
```

---

### Task 5: `DnsModule`

**Files:**
- Create: `apps/api/src/dns/dns.module.ts`

**Interfaces:**
- Produces: `DnsModule` exporting `DNS_PROVIDER` (→ `OvhDnsClient`) and `VercelDomainsClient`.

- [ ] **Step 1: Write the module**

```ts
// apps/api/src/dns/dns.module.ts
import { Module } from '@nestjs/common';

import { DNS_PROVIDER } from './dns-provider.interface';
import { OvhDnsClient } from './ovh-dns.client';
import { VercelDomainsClient } from './vercel-domains.client';

@Module({
  providers: [
    OvhDnsClient,
    VercelDomainsClient,
    { provide: DNS_PROVIDER, useExisting: OvhDnsClient },
  ],
  exports: [DNS_PROVIDER, VercelDomainsClient],
})
export class DnsModule {}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/dns/dns.module.ts
git commit -m "feat(api): DnsModule wiring (DNS_PROVIDER + VercelDomainsClient)"
```

---

# PR-2 — Provisioning (schéma + service + branchement)

> **Checkpoint 🛑** : cette PR modifie le schéma Prisma (migration) et la zone multi-tenant. Revue sécurité obligatoire avant merge.

### Task 6: Migration Prisma — `DomainStatus` + champs `Tenant`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create (généré): `apps/api/prisma/migrations/<timestamp>_add_tenant_domain_status/migration.sql`

**Interfaces:**
- Produces: enum Prisma `DomainStatus` (`NONE|PROVISIONING|ACTIVE|FAILED`) ; champs `Tenant.domainStatus` (default `NONE`), `customDomain?`, `domainError?`, `domainProvisionedAt?`.

- [ ] **Step 1: Add the enum** (près des autres enums, après `enum TenantStatus { ... }`)

```prisma
enum DomainStatus {
  NONE
  PROVISIONING
  ACTIVE
  FAILED
}
```

- [ ] **Step 2: Add fields to `model Tenant`** (après la ligne `onboardingCompletedAt DateTime?`)

```prisma
  // Domain automation (OVH CNAME + Vercel) — additive, backward-compat.
  domainStatus        DomainStatus @default(NONE)
  customDomain        String?
  domainError         String?
  domainProvisionedAt DateTime?
```

- [ ] **Step 3: Generate the migration**

Run: `pnpm --filter=@ecole-saas/api exec prisma migrate dev --name add_tenant_domain_status`
Expected: a new migration folder is created; `prisma generate` updates the client. Verify the SQL only contains `ALTER TABLE "tenants" ADD COLUMN ...` + `CREATE TYPE "DomainStatus"` (no DROP).

- [ ] **Step 4: Type-check (Prisma client picks up new fields)**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add Tenant.domainStatus + custom domain fields (additive)"
```

---

### Task 7: Config `domainAutomation` + fail-fast

**Files:**
- Modify: `apps/api/src/common/config/configuration.ts`
- Modify: `apps/api/src/common/config/env.validation.ts`

**Interfaces:**
- Produces: `AppConfig.domainAutomation` :
  ```ts
  domainAutomation: {
    enabled: boolean;
    dnsZone: string;
    cnameTarget: string;
    baseDomain: string;
    pollIntervalMs: number;
    pollMaxAttempts: number;
    ovh: { appKey?: string; appSecret?: string; consumerKey?: string; apiBase: string };
    vercel: { token?: string; projectId?: string; teamId?: string; apiBase: string };
  }
  ```

- [ ] **Step 1: Extend the `AppConfig` interface** (dans `configuration.ts`, après le bloc `demoRequest`)

```ts
  /** Tenant domain automation (OVH CNAME + Vercel). Gated by ENABLE_TENANT_DOMAIN_AUTOMATION. */
  domainAutomation: {
    enabled: boolean;
    dnsZone: string;
    cnameTarget: string;
    baseDomain: string;
    pollIntervalMs: number;
    pollMaxAttempts: number;
    ovh: { appKey?: string; appSecret?: string; consumerKey?: string; apiBase: string };
    vercel: { token?: string; projectId?: string; teamId?: string; apiBase: string };
  };
```

- [ ] **Step 2: Add named constants + the config block** (dans `configuration()`, avant le `return`, déclarer les constantes en tête de fichier)

Top of file, after the imports:
```ts
const DEFAULT_DOMAIN_POLL_INTERVAL_MS = 10_000;
const DEFAULT_DOMAIN_POLL_MAX_ATTEMPTS = 180; // ~30 min @ 10s
```

In the returned object (after `demoRequest: { ... },`):
```ts
    domainAutomation: {
      enabled: process.env.ENABLE_TENANT_DOMAIN_AUTOMATION === 'true',
      dnsZone: process.env.OVH_DNS_ZONE ?? 'klasso.tn',
      cnameTarget: process.env.DOMAIN_CNAME_TARGET ?? 'cname.vercel-dns.com.',
      baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'klasso.tn',
      pollIntervalMs: parseInt(
        process.env.DOMAIN_POLL_INTERVAL_MS ?? String(DEFAULT_DOMAIN_POLL_INTERVAL_MS), 10),
      pollMaxAttempts: parseInt(
        process.env.DOMAIN_POLL_MAX_ATTEMPTS ?? String(DEFAULT_DOMAIN_POLL_MAX_ATTEMPTS), 10),
      ovh: {
        appKey: process.env.OVH_APP_KEY,
        appSecret: process.env.OVH_APP_SECRET,
        consumerKey: process.env.OVH_CONSUMER_KEY,
        apiBase: process.env.OVH_API_BASE ?? 'https://eu.api.ovh.com/1.0',
      },
      vercel: {
        token: process.env.VERCEL_TOKEN,
        projectId: process.env.VERCEL_PROJECT_ID,
        teamId: process.env.VERCEL_TEAM_ID,
        apiBase: process.env.VERCEL_API_BASE ?? 'https://api.vercel.com',
      },
    },
```

- [ ] **Step 3: Fail-fast validation** (dans `env.validation.ts`, ajouter une vérification : si `ENABLE_TENANT_DOMAIN_AUTOMATION === 'true'`, exiger `OVH_APP_KEY`, `OVH_APP_SECRET`, `OVH_CONSUMER_KEY`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`).

Add at the end of the validation function (adapt to the file's existing style):
```ts
  if (process.env.ENABLE_TENANT_DOMAIN_AUTOMATION === 'true') {
    const required = ['OVH_APP_KEY', 'OVH_APP_SECRET', 'OVH_CONSUMER_KEY', 'VERCEL_TOKEN', 'VERCEL_PROJECT_ID'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Domain automation enabled but missing env: ${missing.join(', ')}`);
    }
  }
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/common/config/configuration.ts apps/api/src/common/config/env.validation.ts
git commit -m "feat(api): domainAutomation config block + fail-fast validation"
```

---

### Task 8: `InviteTokensService` — `baseUrlOverride`

**Files:**
- Modify: `apps/api/src/admin/invite-tokens.service.ts:38-88`

**Interfaces:**
- Produces: `InviteTokensService.create(superAdminId, dto, meta?, tenantId?, baseUrlOverride?: string)` — when `baseUrlOverride` is set, the returned `url` is `${baseUrlOverride}/register?token=${plaintext}`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/admin/invite-tokens.service.spec.ts  (add to existing or create)
import { describe, it, expect, vi } from 'vitest';
import { InviteTokensService } from './invite-tokens.service';

describe('InviteTokensService baseUrlOverride', () => {
  it('builds the register URL from the override host when provided', async () => {
    const prisma = { inviteToken: { create: vi.fn().mockResolvedValue({}) }, auditLog: { create: vi.fn() } } as any;
    const config = { get: () => 'https://klasso.tn' } as any;
    const svc = new InviteTokensService(prisma, config);
    const res = await svc.create('admin1', { invitedEmail: 'a@b.tn' } as any, {}, null, 'https://ecole.klasso.tn');
    expect(res.url.startsWith('https://ecole.klasso.tn/register?token=')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/admin/invite-tokens.service.spec.ts`
Expected: FAIL — `create` ignores the 5th argument (URL uses `webAppUrl`).

- [ ] **Step 3: Implement** — update the signature and URL build:

Signature (line ~48):
```ts
    tenantId: string | null = null,
    baseUrlOverride?: string,
  ): Promise<InviteTokenCreatedDto> {
```

URL build (replace lines ~76-87):
```ts
    const baseUrl = baseUrlOverride ?? this.config.get<string>('webAppUrl', 'https://klasso.tn');
    return {
      id,
      token: plaintext,
      url: `${baseUrl}/register?token=${plaintext}`,
      invitedEmail,
      intendedRole,
      expiresAt: expiresAt.toISOString(),
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/admin/invite-tokens.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/invite-tokens.service.ts apps/api/src/admin/invite-tokens.service.spec.ts
git commit -m "feat(api): InviteTokensService supports baseUrlOverride for subdomain links"
```

---

### Task 9: `DomainProvisioningService`

**Files:**
- Create: `apps/api/src/admin/domain-provisioning.service.ts`
- Test: `apps/api/src/admin/domain-provisioning.service.spec.ts`

**Interfaces:**
- Consumes: `DNS_PROVIDER` (`DnsProvider`), `VercelDomainsClient`, `PrismaService`, `ConfigService`, `ResendService`, `InviteTokensService`.
- Produces:
  - `provision(tenantId: string, superAdminId: string): Promise<void>` — full flow, sets `domainStatus`, emails on resolve.
  - `deprovision(tenantId: string): Promise<void>` — remove Vercel domain + OVH CNAME, set `NONE`.
  - `reconcilePending(): Promise<void>` — re-arm polling for `PROVISIONING` tenants (boot).
  - `isEnabled(): boolean`.
- Constants: `slugFromTenant`, uses `config.domainAutomation.{cnameTarget,baseDomain,pollIntervalMs,pollMaxAttempts}`.

> Email on resolve mints a **fresh** invite via `InviteTokensService.create(..., baseUrlOverride)` so the flow is restart-safe (no plaintext held across the async boundary). ACTIVE → subdomain URL ; FAILED → path-based URL (fallback) so the tenant is never blocked.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/admin/domain-provisioning.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainProvisioningService } from './domain-provisioning.service';
import { DomainStatus } from '@prisma/client';

function deps(overrides: any = {}) {
  const tenant = { id: 't1', slug: 'ecole', name: 'École', brand: null, locale: 'fr' };
  const admin = { id: 'u1', email: 'admin@ecole.tn', firstName: 'A', lastName: 'B' };
  const prisma = {
    tenant: {
      findFirst: vi.fn().mockResolvedValue(tenant),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(tenant),
    },
    user: { findFirst: vi.fn().mockResolvedValue(admin) },
    auditLog: { create: vi.fn() },
  };
  const dns = { upsertCname: vi.fn().mockResolvedValue({ id: '1' }), deleteCname: vi.fn() };
  const vercel = { addDomain: vi.fn(), isReady: vi.fn().mockResolvedValue(true), removeDomain: vi.fn() };
  const resend = { send: vi.fn().mockResolvedValue({ success: true }) };
  const invites = { create: vi.fn().mockResolvedValue({ id: 'i1', url: 'https://ecole.klasso.tn/register?token=x', expiresAt: '2030-01-01' }) };
  const config = {
    get: (k: string) => ({
      'domainAutomation.enabled': true,
      'domainAutomation.cnameTarget': 'cname.vercel-dns.com.',
      'domainAutomation.baseDomain': 'klasso.tn',
      'domainAutomation.pollIntervalMs': 0,
      'domainAutomation.pollMaxAttempts': 3,
    }[k]),
  };
  return { prisma, dns, vercel, resend, invites, config, ...overrides };
}

function make(d: any) {
  return new DomainProvisioningService(d.dns, d.vercel, d.prisma as any, d.config as any, d.resend as any, d.invites as any);
}

describe('DomainProvisioningService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('provisions → ACTIVE and emails the subdomain invite', async () => {
    const d = deps();
    await make(d).provision('t1', 'super1');
    expect(d.dns.upsertCname).toHaveBeenCalledWith('ecole', 'cname.vercel-dns.com.');
    expect(d.vercel.addDomain).toHaveBeenCalledWith('ecole.klasso.tn');
    expect(d.invites.create).toHaveBeenCalledWith(
      'super1', expect.anything(), expect.anything(), 't1', 'https://ecole.klasso.tn',
    );
    expect(d.resend.send).toHaveBeenCalled();
    const last = d.prisma.tenant.update.mock.calls.at(-1)[0];
    expect(last.data.domainStatus).toBe(DomainStatus.ACTIVE);
  });

  it('marks FAILED and sends a path-based fallback invite when SSL never becomes ready', async () => {
    const d = deps();
    d.vercel.isReady = vi.fn().mockResolvedValue(false);
    await make(d).provision('t1', 'super1');
    const last = d.prisma.tenant.update.mock.calls.at(-1)[0];
    expect(last.data.domainStatus).toBe(DomainStatus.FAILED);
    // fallback invite uses no baseUrlOverride (5th arg undefined)
    expect(d.invites.create).toHaveBeenCalledWith('super1', expect.anything(), expect.anything(), 't1', undefined);
    expect(d.resend.send).toHaveBeenCalled();
  });

  it('marks FAILED when OVH throws', async () => {
    const d = deps();
    d.dns.upsertCname = vi.fn().mockRejectedValue(new Error('ovh down'));
    await make(d).provision('t1', 'super1');
    const last = d.prisma.tenant.update.mock.calls.at(-1)[0];
    expect(last.data.domainStatus).toBe(DomainStatus.FAILED);
    expect(last.data.domainError).toContain('ovh down');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/admin/domain-provisioning.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/admin/domain-provisioning.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createId } from '@paralleldrive/cuid2';
import { DomainStatus, UserRole } from '@prisma/client';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { PrismaService } from '../common/prisma/prisma.service';
import { ResendService } from '../common/email/resend.service';
import { InviteEmail } from '../common/email/templates/invite';
import { DNS_PROVIDER, type DnsProvider } from '../dns/dns-provider.interface';
import { VercelDomainsClient } from '../dns/vercel-domains.client';
import { InviteTokensService } from './invite-tokens.service';

const INVITE_EXPIRES_IN_DAYS = 14;

@Injectable()
export class DomainProvisioningService {
  private readonly logger = new Logger(DomainProvisioningService.name);

  constructor(
    @Inject(DNS_PROVIDER) private readonly dns: DnsProvider,
    private readonly vercel: VercelDomainsClient,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly resend: ResendService,
    private readonly invites: InviteTokensService,
  ) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('domainAutomation.enabled', false);
  }

  /** Full provisioning flow. Never throws — failures are captured into domainStatus=FAILED. */
  async provision(tenantId: string, superAdminId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) return;
    const slug = tenant.slug;
    const baseDomain = this.config.get<string>('domainAutomation.baseDomain', 'klasso.tn');
    const target = this.config.get<string>('domainAutomation.cnameTarget', 'cname.vercel-dns.com.');
    const fqdn = `${slug}.${baseDomain}`;

    try {
      await this.dns.upsertCname(slug, target);
      await this.vercel.addDomain(fqdn);
      const ready = await this.pollReady(fqdn);
      if (!ready) {
        await this.fail(tenantId, superAdminId, tenant, 'Domain not verified before timeout');
        return;
      }
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { domainStatus: DomainStatus.ACTIVE, customDomain: fqdn, domainError: null, domainProvisionedAt: new Date() },
      });
      await this.sendInvite(tenant, superAdminId, `https://${fqdn}`);
      await this.audit('admin.tenant.domain_provisioned', superAdminId, { tenantId, fqdn });
    } catch (err) {
      await this.fail(tenantId, superAdminId, tenant, err instanceof Error ? err.message : String(err));
    }
  }

  async deprovision(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) return;
    const baseDomain = this.config.get<string>('domainAutomation.baseDomain', 'klasso.tn');
    try {
      await this.vercel.removeDomain(`${tenant.slug}.${baseDomain}`);
      await this.dns.deleteCname(tenant.slug);
    } finally {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { domainStatus: DomainStatus.NONE, customDomain: null, domainProvisionedAt: null },
      });
    }
  }

  /** Boot reconciliation: re-arm polling for tenants left in PROVISIONING (e.g. after a restart). */
  async reconcilePending(): Promise<void> {
    if (!this.isEnabled()) return;
    const pending = await this.prisma.tenant.findMany({ where: { domainStatus: DomainStatus.PROVISIONING, deletedAt: null } });
    if (!pending.length) return;
    const superAdmin = await this.prisma.user.findFirst({ where: { role: UserRole.SUPER_ADMIN, deletedAt: null } });
    if (!superAdmin) return;
    for (const t of pending) {
      void this.provision(t.id, superAdmin.id);
    }
  }

  private async pollReady(fqdn: string): Promise<boolean> {
    const intervalMs = this.config.get<number>('domainAutomation.pollIntervalMs', 10_000);
    const maxAttempts = this.config.get<number>('domainAutomation.pollMaxAttempts', 180);
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.vercel.isReady(fqdn)) return true;
      if (intervalMs > 0) await new Promise((r) => setTimeout(r, intervalMs));
    }
    return false;
  }

  private async fail(tenantId: string, superAdminId: string, tenant: { slug: string; name: string; brand: unknown }, message: string): Promise<void> {
    this.logger.error(`Domain provisioning failed for ${tenant.slug}: ${message}`);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { domainStatus: DomainStatus.FAILED, domainError: message },
    });
    // Fallback: send the invite on the path-based apex URL so the tenant is never blocked.
    await this.sendInvite(tenant, superAdminId, undefined);
    await this.audit('admin.tenant.domain_failed', superAdminId, { tenantId, message });
  }

  private async sendInvite(
    tenant: { slug: string; name: string; brand: unknown },
    superAdminId: string,
    baseUrlOverride: string | undefined,
  ): Promise<void> {
    const admin = await this.prisma.user.findFirst({
      where: { tenantId: (await this.tenantIdOf(tenant.slug)), role: UserRole.SCHOOL_ADMIN, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) return;
    const invite = await this.invites.create(
      superAdminId,
      { invitedEmail: admin.email, intendedRole: UserRole.SCHOOL_ADMIN, expiresInDays: INVITE_EXPIRES_IN_DAYS },
      {},
      await this.tenantIdOf(tenant.slug),
      baseUrlOverride,
    );
    const brand = (tenant.brand as TenantBrand | null) ?? DEFAULT_BRAND;
    await this.resend.send({
      to: admin.email,
      subject: `Bienvenue sur Klasso — administrer ${tenant.name}`,
      template: InviteEmail({
        inviterName: 'Klasso',
        registerUrl: invite.url,
        expiresInDays: INVITE_EXPIRES_IN_DAYS,
        brand,
        tenantName: tenant.name,
      }),
    });
  }

  private async tenantIdOf(slug: string): Promise<string> {
    const t = await this.prisma.tenant.findFirst({ where: { slug }, select: { id: true } });
    return t!.id;
  }

  private async audit(action: string, userId: string, metadata: object): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { id: createId(), action, resource: 'tenant', tenantId: null, userId, metadata },
      });
    } catch (err) {
      this.logger.error(`audit ${action} failed: ${String(err)}`);
    }
  }
}
```

> **Note for the implementer:** the test injects mocks positionally — keep the constructor parameter order `(dns, vercel, prisma, config, resend, invites)`. The `sendInvite` helper above re-resolves the tenant id from the slug to stay decoupled; if you prefer, thread `tenantId` through directly (simpler) and drop `tenantIdOf` — just keep the public method signatures and the `invites.create(..., baseUrlOverride)` call shape the e2e test asserts.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/admin/domain-provisioning.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/domain-provisioning.service.ts apps/api/src/admin/domain-provisioning.service.spec.ts
git commit -m "feat(api): DomainProvisioningService (provision/poll/deprovision/reconcile)"
```

---

### Task 10: Brancher `TenantsService.create` + DTO

**Files:**
- Modify: `apps/api/src/admin/tenants.service.ts:55-171`
- Modify: `apps/api/src/admin/dto/tenant-response.dto.ts:26-30`

**Interfaces:**
- Consumes: `DomainProvisioningService` (Task 9).
- Produces: `CreateTenantResponseDto.invite: InviteSummaryDto | null` + `CreateTenantResponseDto.domainStatus: string`. When automation is on: tenant is created `PROVISIONING`, **no invite minted / no email sent here**, provisioning is triggered detached; when off: behaviour unchanged.

- [ ] **Step 1: Update the response DTO**

```ts
// tenant-response.dto.ts — replace CreateTenantResponseDto
export class CreateTenantResponseDto {
  @ApiProperty({ type: TenantSummaryDto }) tenant!: TenantSummaryDto;
  @ApiPropertyOptional({ type: InviteSummaryDto, nullable: true }) invite!: InviteSummaryDto | null;
  @ApiProperty() inviteEmailSent!: boolean;
  @ApiProperty({ enum: ['NONE', 'PROVISIONING', 'ACTIVE', 'FAILED'] }) domainStatus!: string;
}
```
Also add `domainStatus` + `customDomain` to `TenantSummaryDto`:
```ts
  @ApiProperty({ enum: ['NONE', 'PROVISIONING', 'ACTIVE', 'FAILED'] }) domainStatus!: string;
  @ApiPropertyOptional({ nullable: true }) customDomain!: string | null;
```

- [ ] **Step 2: Inject the service + branch `create()`**

In `tenants.service.ts` constructor, add `private readonly domains: DomainProvisioningService,` and import it.

Replace the tail of `create()` (the invite + email + return block, lines ~112-170) with:
```ts
    if (this.domains.isEnabled()) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { domainStatus: 'PROVISIONING', customDomain: `${slug}.${this.config.get<string>('domainAutomation.baseDomain', 'klasso.tn')}` },
      });
      await this.writeTenantCreatedAudit(superAdminId, tenant.id, slug, adminEmail, null, meta);
      // Detached from the request: DNS + Vercel + SSL poll, then email on resolve.
      void this.domains.provision(tenant.id, superAdminId);
      return { tenant: await this.buildSummary(tenant.id), invite: null, inviteEmailSent: false, domainStatus: 'PROVISIONING' };
    }

    // Automation OFF — unchanged legacy flow (immediate path-based invite).
    const invite = await this.inviteTokens.create(
      superAdminId,
      { invitedEmail: adminEmail, intendedRole: UserRole.SCHOOL_ADMIN, expiresInDays: INVITE_EXPIRES_IN_DAYS },
      meta,
    );
    await this.writeTenantCreatedAudit(superAdminId, tenant.id, slug, adminEmail, invite.id, meta);
    let inviteEmailSent = false;
    if (dto.sendInviteEmail !== false) {
      inviteEmailSent = await this.sendCreateInviteEmail(superAdminId, tenant, brand, invite.url);
    }
    return {
      tenant: await this.buildSummary(tenant.id),
      invite: { id: invite.id, url: invite.url, expiresAt: invite.expiresAt },
      inviteEmailSent,
      domainStatus: 'NONE',
    };
```
Extract the existing audit + email bodies into private helpers `writeTenantCreatedAudit(...)` and `sendCreateInviteEmail(...)` (move the current inline code verbatim) so `create()` stays < 50 lines. Update `buildSummary` to include `domainStatus: t.domainStatus` and `customDomain: t.customDomain`.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter=@ecole-saas/api type-check`
Expected: PASS.

- [ ] **Step 4: Run the existing tenants unit/spec suite**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/admin`
Expected: PASS (adjust any spec asserting the old return shape to expect `domainStatus: 'NONE'` + `invite` present when flag off).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/tenants.service.ts apps/api/src/admin/dto/tenant-response.dto.ts
git commit -m "feat(api): wire tenant creation to domain provisioning (flagged)"
```

---

### Task 11: Endpoint retry + module + boot reconcile

**Files:**
- Modify: `apps/api/src/admin/tenants.controller.ts`
- Modify: `apps/api/src/admin/admin.module.ts`

**Interfaces:**
- Produces: `POST /admin/tenants/:id/domain/retry` (SUPER_ADMIN) → `{ domainStatus: 'PROVISIONING' }` and triggers `provision()` detached. `AdminModule` imports `DnsModule`, provides `DomainProvisioningService`, runs `reconcilePending()` on `OnApplicationBootstrap`.

- [ ] **Step 1: Add the controller endpoint**

```ts
  @Post(':id/domain/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry/kick domain provisioning for a tenant (SUPER_ADMIN only)' })
  @ApiResponse({ status: 202 })
  async retryDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ domainStatus: string }> {
    return this.tenants.retryDomain(id, user.id);
  }
```
Add `retryDomain(id, superAdminId)` to `TenantsService`: set `domainStatus='PROVISIONING'`, `void this.domains.provision(id, superAdminId)`, return `{ domainStatus: 'PROVISIONING' }`. Throw `NotFoundException` if tenant missing.

- [ ] **Step 2: Wire the module + bootstrap reconcile**

```ts
// admin.module.ts
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { DnsModule } from '../dns/dns.module';
import { DomainProvisioningService } from './domain-provisioning.service';

@Module({
  imports: [EmailModule, DnsModule],
  controllers: [InviteTokensController, TenantsController, AuditController, PlatformAnalyticsController],
  providers: [InviteTokensService, TenantsService, AuditService, PlatformAnalyticsService, DomainProvisioningService],
  exports: [InviteTokensService, TenantsService],
})
export class AdminModule implements OnApplicationBootstrap {
  constructor(private readonly domains: DomainProvisioningService) {}
  async onApplicationBootstrap(): Promise<void> {
    await this.domains.reconcilePending();
  }
}
```

- [ ] **Step 3: Type-check + unit**

Run: `pnpm --filter=@ecole-saas/api type-check && pnpm --filter=@ecole-saas/api exec vitest run src/admin`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/admin/tenants.controller.ts apps/api/src/admin/admin.module.ts apps/api/src/admin/tenants.service.ts
git commit -m "feat(api): domain retry endpoint + boot reconciliation"
```

---

### Task 12: e2e — flux complet (clients mockés)

**Files:**
- Modify: `apps/api/test/admin-tenants.e2e-spec.ts`

**Interfaces:**
- Consumes: existing e2e bootstrap helpers in that file. Override `DNS_PROVIDER` + `VercelDomainsClient` providers with in-memory fakes; toggle `ENABLE_TENANT_DOMAIN_AUTOMATION` via the test `ConfigService`.

- [ ] **Step 1: Write the e2e cases** (append to the describe block)

```ts
describe('domain automation', () => {
  // Build the testing module with automation ON and DNS/Vercel fakes:
  //   .overrideProvider(DNS_PROVIDER).useValue({ upsertCname: vi.fn().mockResolvedValue({id:'1'}), deleteCname: vi.fn() })
  //   .overrideProvider(VercelDomainsClient).useValue({ addDomain: vi.fn(), isReady: vi.fn().mockResolvedValue(true), removeDomain: vi.fn() })
  //   and a config where domainAutomation.enabled=true, pollIntervalMs=0, pollMaxAttempts=2.

  it('creates tenant in PROVISIONING with no invite in the response (flag on)', async () => {
    const res = await createTenant({ slug: 'dns-on-1' }); // helper posts /admin/tenants as SUPER_ADMIN
    expect(res.body.domainStatus).toBe('PROVISIONING');
    expect(res.body.invite).toBeNull();
    expect(res.body.inviteEmailSent).toBe(false);
  });

  it('reaches ACTIVE and emails a subdomain invite', async () => {
    // after provision() resolves (awaitable via the fake), GET /admin/tenants/:id
    // expect domainStatus ACTIVE, customDomain "dns-on-1.klasso.tn", resend.send called with subdomain URL.
  });

  it('falls back to FAILED + path-based invite when isReady stays false', async () => {
    // vercel.isReady → false ; expect FAILED + domainError set + resend.send called (path-based url).
  });

  it('retry endpoint re-kicks provisioning', async () => {
    // POST /admin/tenants/:id/domain/retry → 202 { domainStatus: 'PROVISIONING' }.
  });

  it('flag OFF keeps the legacy flow (invite present, domainStatus NONE)', async () => {
    // rebuild module with domainAutomation.enabled=false ; create → invite not null, domainStatus 'NONE'.
  });
});
```

> The implementer fills the assertions using this file's existing patterns (supertest agent, SUPER_ADMIN auth helper, prisma reset). Use `vi.fn()` spies on the fake clients to assert call args, and `await new Promise(r => setImmediate(r))` to let the detached `void provision()` settle when `pollIntervalMs=0`.

- [ ] **Step 2: Run the e2e suite**

Run (CI or a Linux box; native build broken on Windows): `pnpm --filter=@ecole-saas/api test:e2e admin-tenants`
Expected: PASS for all new cases.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/admin-tenants.e2e-spec.ts
git commit -m "test(api): e2e domain automation (provision/active/failed/retry/flag-off)"
```

---

### Task 13: Régression isolation R10 (critique)

**Files:**
- Modify: `apps/api/test/multi-tenant-isolation.e2e-spec.ts`

**Interfaces:**
- Consumes: existing isolation harness. Adds a case proving the `Host` header never affects scoping.

- [ ] **Step 1: Write the failing/guard test**

```ts
it('a spoofed tenant subdomain Host never leaks another tenant data', async () => {
  // Arrange: tenant A (with JWT for A) and tenant B with at least one student.
  // Act: GET /students with header Host: <B.slug>.klasso.tn using A's access token.
  const res = await agent.get('/students')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('Host', `${tenantB.slug}.klasso.tn`);
  // Assert: only tenant A rows, zero tenant B rows.
  expect(res.status).toBe(200);
  expect(res.body.data.every((s: any) => s.tenantId === tenantA.id)).toBe(true);
});
```

- [ ] **Step 2: Run**

Run (CI): `pnpm --filter=@ecole-saas/api test:e2e multi-tenant-isolation`
Expected: PASS (scoping is JWT-only; Host is ignored).

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/multi-tenant-isolation.e2e-spec.ts
git commit -m "test(api): regression — spoofed subdomain Host does not break tenant isolation"
```

---

# PR-3 — Activation web (ops + vérification)

> Le code web sous-domaine **existe déjà** : `cors-origin.ts` (wildcard `*.klasso.tn`), `next.config.mjs` CSP (`connect-src https://*.klasso.tn wss://*.klasso.tn`), `middleware.ts` + `resolveBrandedRewrite`. Il n'y a **pas de code à écrire** — seulement activer les flags et vérifier.

### Task 14: Vérifier l'existant + activer les flags

**Files:**
- Verify only: `apps/api/src/common/config/cors-origin.ts`, `apps/web/next.config.mjs`, `apps/web/middleware.ts`.

- [ ] **Step 1: Confirmer les tests existants verts**

Run: `pnpm --filter=@ecole-saas/api exec vitest run src/common/config/cors-origin.spec.ts`
Expected: PASS (accepte `ecole.klasso.tn` + apex, rejette `evil.com` / `http://` / `a.b.klasso.tn`).

- [ ] **Step 2: Confirmer le test du rewrite middleware** (créer s'il manque)

```ts
// apps/web/lib/tenant/subdomain-rewrite.spec.ts  (si absent)
import { describe, it, expect } from 'vitest';
import { resolveBrandedRewrite } from './subdomain-rewrite';
const base = { enabled: true, baseDomain: 'klasso.tn', locales: ['fr', 'en', 'ar', 'es'] as const };

describe('resolveBrandedRewrite', () => {
  it('rewrites pre-auth /login on a subdomain', () => {
    expect(resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/login' })).toBe('/fr/t/ecole/login');
  });
  it('passes /dashboard through (tenant via JWT)', () => {
    expect(resolveBrandedRewrite({ ...base, host: 'ecole.klasso.tn', path: '/fr/dashboard' })).toBeNull();
  });
  it('ignores reserved slugs', () => {
    expect(resolveBrandedRewrite({ ...base, host: 'www.klasso.tn', path: '/fr/login' })).toBeNull();
  });
});
```
Run: `pnpm --filter=@ecole-saas/web exec vitest run lib/tenant/subdomain-rewrite.spec.ts`
Expected: PASS.

- [ ] **Step 3: Activer les flags (ops — Vercel, projet `ecole-saas`)** — checkpoint 🛑 (modif env prod)

Web env (Production + Preview):
```
ENABLE_SUBDOMAIN_RESOLVER=true
NEXT_PUBLIC_BASE_DOMAIN=klasso.tn
NEXT_PUBLIC_ENABLE_SUBDOMAIN=true
```
API env (Railway):
```
ENABLE_TENANT_DOMAIN_AUTOMATION=true
OVH_APP_KEY=… OVH_APP_SECRET=… OVH_CONSUMER_KEY=…
OVH_DNS_ZONE=klasso.tn  OVH_API_BASE=https://eu.api.ovh.com/1.0
DOMAIN_CNAME_TARGET=cname.vercel-dns.com.
VERCEL_TOKEN=… VERCEL_PROJECT_ID=prj_DsqPNx90qY3R98l71Pr92DHPoE7R VERCEL_TEAM_ID=…
NEXT_PUBLIC_BASE_DOMAIN=klasso.tn
```
> ⚠️ La **consumer key OVH doit être restreinte** aux routes `GET/POST/DELETE /domain/zone/klasso.tn/record*`, `POST /domain/zone/klasso.tn/refresh`, `GET /auth/time` (least privilege — DA9 / R2).

- [ ] **Step 4: Commit (le spec de test web seulement)**

```bash
git add apps/web/lib/tenant/subdomain-rewrite.spec.ts
git commit -m "test(web): subdomain rewrite matrix (pre-auth rewrite / dashboard passthrough)"
```

---

# UI — Statut domaine dans la console super-admin

### Task 15: Badge `domainStatus` + bouton « Réessayer »

**Files:**
- Modify: la page détail tenant `apps/web/app/[locale]/(app)/platform/tenants/[id]/` (composant détail) + le client API admin tenants.

> **REQUIRED SKILL** avant toute UI : `frontend-design` (design system V7). Réutiliser un pattern de badge existant (`InvoiceStatusBadge`).

- [ ] **Step 1: Add a `DomainStatusBadge`** (atom, tons : provisioning=amber, active=emerald, failed=red, none=muted), avec test.

```tsx
// apps/web/components/tenants/domain-status-badge.tsx
const TONE = {
  PROVISIONING: 'bg-amber-50 text-amber-700 ring-amber-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  FAILED: 'bg-red-50 text-red-700 ring-red-200',
  NONE: 'bg-muted text-muted-foreground ring-border',
} as const;
const LABEL = { PROVISIONING: 'Domaine en cours…', ACTIVE: 'Domaine actif', FAILED: 'Échec domaine', NONE: '—' } as const;
export function DomainStatusBadge({ status }: { status: keyof typeof TONE }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${TONE[status]}`}>{LABEL[status]}</span>;
}
```

- [ ] **Step 2: Show the badge + custom domain link on the tenant detail page**; if `domainStatus === 'FAILED'` (or `'NONE'`), render a « Réessayer le provisioning » button calling `POST /admin/tenants/:id/domain/retry`, then refetch.

- [ ] **Step 3: Type-check + lint + test**

Run: `pnpm --filter=@ecole-saas/web type-check && pnpm --filter=@ecole-saas/web lint && pnpm --filter=@ecole-saas/web exec vitest run components/tenants`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/tenants apps/web/app/[locale]/(app)/platform/tenants
git commit -m "feat(web): domain status badge + retry action in super-admin tenant detail"
```

---

# Runbook & validation manuelle

### Task 16: Runbook de provisioning + recette

**Files:**
- Create: `docs/superpowers/runbooks/2026-06-18-tenant-domain-provisioning.md`

- [ ] **Step 1: Write the runbook** with: env checklist (Task 14 §3), OVH consumer-key restriction, and the manual recette:

```
1. Flag on (staging). Créer un tenant `test-dns` via /platform/tenants (UI super-admin).
2. dig +short test-dns.klasso.tn CNAME   → cname.vercel-dns.com.
3. curl -sI https://test-dns.klasso.tn/login   → HTTP/2 200 + cert SSL valide
4. Email reçu : lien = https://test-dns.klasso.tn/register?token=…
5. S'inscrire → login → /dashboard brandé (logo/couleurs du tenant)
6. Isolation : https://<autre-tenant>.klasso.tn/login → branding de l'autre, pas de fuite
7. Échec simulé (slug bidon côté Vercel) → domainStatus FAILED + email fallback path-based → bouton Réessayer
8. Deprovision (action admin) → dig ne résout plus + domaine retiré de Vercel
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/2026-06-18-tenant-domain-provisioning.md
git commit -m "docs: tenant domain provisioning runbook + manual recette"
```

---

## Self-Review

**Spec coverage:**
- DA1 CNAME per-tenant via OVH → Task 3. ✅
- DA2 async + status → Tasks 9, 10, 11. ✅
- DA3 schema fields → Task 6. ✅
- DA4 email after ACTIVE + fallback → Task 9 (`sendInvite`/`fail`) + Task 8 (`baseUrlOverride`). ✅
- DA5 zero dependency → fetch + node:crypto throughout. ✅
- DA6 poller + boot reconcile + retry → Tasks 9, 11. ✅
- DA7 flag gating → Tasks 7, 9 (`isEnabled`), 10. ✅
- DA8 web activation → Task 14 (code already present). ✅
- DA9 guard + reserved subdomains → Task 1. ✅
- Tests (unit/e2e/web/isolation) → Tasks 1-4, 9, 12, 13, 14. ✅
- Security (least-priv key, no secrets logged, audit) → Tasks 9 (audit), 14 §3 (key restriction). ✅
- UI status → Task 15. ✅
- Runbook → Task 16. ✅

**Placeholder scan:** e2e assertions in Task 12 are intentionally described as fill-ins guided by the existing file's patterns (the harness/agent helpers are file-specific); all production code blocks are complete. No "TODO/TBD" in shipping code.

**Type consistency:** `DnsProvider.upsertCname(sub, target, ttl?)`, `VercelDomainsClient.{addDomain,isReady,removeDomain}`, `DomainProvisioningService.{provision(tenantId,superAdminId),deprovision,reconcilePending,isEnabled}`, `InviteTokensService.create(...,baseUrlOverride?)`, `CreateTenantResponseDto.{invite:nullable,domainStatus}` — consistent across tasks.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-18-tenant-domain-automation-ovh.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
