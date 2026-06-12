/** G4 — Réservations cantine `/canteen/reservations`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { ReservationsClient } from './reservations-client';

export default function CanteenReservationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Réservations cantine</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez une classe et une date, puis réservez la cantine élève par élève ou pour toute
          la classe.
        </p>
      </header>

      <ReservationsClient />
    </div>
  );
}
