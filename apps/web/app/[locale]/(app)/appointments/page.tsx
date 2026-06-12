/** G6 — Rendez-vous parents `/appointments`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { AppointmentsClient } from './appointments-client';

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Rendez-vous</h1>
        <p className="text-sm text-muted-foreground">
          Agenda des rendez-vous parents : types, créneaux disponibles et demandes à traiter.
        </p>
      </header>

      <AppointmentsClient />
    </div>
  );
}
