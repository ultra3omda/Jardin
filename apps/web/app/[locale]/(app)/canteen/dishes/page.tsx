/** G4 — Catalogue de plats `/canteen/dishes`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { DishesClient } from './dishes-client';

export default function CanteenDishesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Plats de la cantine</h1>
        <p className="text-sm text-muted-foreground">
          Catalogue des plats proposés à la cantine (ingrédients, allergènes, disponibilité).
        </p>
      </header>

      <DishesClient />
    </div>
  );
}
