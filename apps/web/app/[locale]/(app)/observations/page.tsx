/** G3 — Observations structurées `/observations`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { ObservationsClient } from './observations-client';

export default function ObservationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Observations</h1>
        <p className="text-sm text-muted-foreground">
          Observations structurées du développement des enfants (langage, motricité, social…).
        </p>
      </header>

      <ObservationsClient />
    </div>
  );
}
