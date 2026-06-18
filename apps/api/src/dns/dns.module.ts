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
