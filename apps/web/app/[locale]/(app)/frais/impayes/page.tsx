/** G2 — Impayés `/frais/impayes`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { UnpaidClient } from './unpaid-client';

export default function UnpaidPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Impayés</h1>
        <p className="text-sm text-muted-foreground">
          Échéances en attente de règlement. Sélectionnez des lignes pour relancer les familles.
        </p>
      </header>

      <UnpaidClient />
    </div>
  );
}
