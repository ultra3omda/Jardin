/** G1 — Caisse du jour `/caisse`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { CashRegisterClient } from './cash-register-client';

export default function CashRegisterPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Caisse du jour</h1>
        <p className="text-sm text-muted-foreground">
          Ouverture, mouvements et clôture de la caisse de l&apos;établissement.
        </p>
      </header>

      <CashRegisterClient />
    </div>
  );
}
