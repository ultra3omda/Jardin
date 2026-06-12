/** G1 — Dépenses `/depenses`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { ExpensesClient } from './expenses-client';

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dépenses</h1>
        <p className="text-sm text-muted-foreground">
          Suivi des dépenses de l&apos;établissement et de leurs fournisseurs.
        </p>
      </header>

      <ExpensesClient />
    </div>
  );
}
