/** G1 — Fournisseurs `/fournisseurs`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { SuppliersClient } from './suppliers-client';

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Fournisseurs</h1>
        <p className="text-sm text-muted-foreground">
          Carnet des fournisseurs de l&apos;établissement.
        </p>
      </header>

      <SuppliersClient />
    </div>
  );
}
