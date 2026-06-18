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
