/** G2 — Affectation en masse `/frais/affectation`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { BulkAssignClient } from './bulk-assign-client';

export default function BulkAssignPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Affectation en masse</h1>
        <p className="text-sm text-muted-foreground">
          Affectez un frais à une classe ou un niveau et générez les échéances pour tous les
          élèves concernés.
        </p>
      </header>

      <BulkAssignClient />
    </div>
  );
}
