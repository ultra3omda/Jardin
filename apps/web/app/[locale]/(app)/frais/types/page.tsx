/** G2 — Référentiel des frais `/frais/types`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { FeeTypesClient } from './fee-types-client';

export default function FeeTypesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Référentiel des frais</h1>
        <p className="text-sm text-muted-foreground">
          Catalogue des frais de l&apos;établissement (scolarité, inscription, options).
        </p>
      </header>

      <FeeTypesClient />
    </div>
  );
}
