/** G4 — Statistiques cantine `/canteen/stats`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { StatsClient } from './stats-client';

export default function CanteenStatsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Statistiques cantine</h1>
        <p className="text-sm text-muted-foreground">
          Repas réservés par jour et répartition par régime alimentaire sur une période.
        </p>
      </header>

      <StatsClient />
    </div>
  );
}
