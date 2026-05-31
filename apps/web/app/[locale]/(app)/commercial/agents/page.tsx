import { AgentsClient } from './agents-client';

export const dynamic = 'force-dynamic';

export default function CommercialAgentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Commerciaux</h1>
        <p className="text-sm text-muted-foreground">
          Créez des sous-administrateurs « commercial » qui signeront les contrats et créeront les
          organisations. Ils n&apos;ont accès à aucune donnée d&apos;établissement.
        </p>
      </header>
      <AgentsClient />
    </div>
  );
}
