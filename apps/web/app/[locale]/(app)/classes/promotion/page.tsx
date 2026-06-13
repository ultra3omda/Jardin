/** G7 — Passage de classe `/classes/promotion`. Server Component shell. */
export const dynamic = 'force-dynamic';

import { ClassPromotionClient } from './class-promotion-client';

export default function ClassPromotionPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Passage de classe</h1>
        <p className="text-sm text-muted-foreground">
          Promotion de fin d&apos;année : associez chaque classe de l&apos;année source à une classe
          de l&apos;année cible, prévisualisez puis confirmez le passage des élèves.
        </p>
      </header>

      <ClassPromotionClient />
    </div>
  );
}
