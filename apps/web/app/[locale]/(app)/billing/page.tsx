/** V7-E — Billing dashboard page `/billing`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { BillingClient } from './billing-client';

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturation</h1>
          <p className="text-sm text-muted-foreground">
            Tableau de bord financier de l&apos;établissement.
          </p>
        </div>
      </header>

      {/* All interactive content (KPIs, table, filters, modals) is in the client boundary */}
      <BillingClient />
    </div>
  );
}
