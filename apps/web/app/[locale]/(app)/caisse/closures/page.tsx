/** G1 — Historique des clôtures `/caisse/closures`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { ClosuresClient } from './closures-client';

export default function ClosuresPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Clôtures de caisse</h1>
        <p className="text-sm text-muted-foreground">
          Historique des caisses clôturées avec écart constaté.
        </p>
      </header>

      <ClosuresClient />
    </div>
  );
}
