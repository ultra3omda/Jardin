/** G6 — Rendez-vous parents `/appointments`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { AppointmentsRouter } from './appointments-router';

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Rendez-vous</h1>
        <p className="text-sm text-muted-foreground">
          Réservez un créneau (parents) ou gérez types, créneaux et demandes (équipe).
        </p>
      </header>

      <AppointmentsRouter />
    </div>
  );
}
