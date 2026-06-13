/** G8 — Calendrier scolaire `/calendar`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { CalendarClient } from './calendar-client';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Calendrier scolaire</h1>
        <p className="text-sm text-muted-foreground">
          Vacances, jours fériés, examens, réunions et événements de l&apos;année scolaire.
        </p>
      </header>

      <CalendarClient />
    </div>
  );
}
