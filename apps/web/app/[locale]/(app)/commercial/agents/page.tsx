import { PageHeader } from '@/components/ui/page-header';
import { AgentsClient } from './agents-client';

export const dynamic = 'force-dynamic';

export default function CommercialAgentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      <PageHeader
        title="Commerciaux"
        description="Créez des sous-administrateurs « commercial » qui signeront les contrats et créeront les organisations. Ils n'ont accès à aucune donnée d'établissement."
      />
      <AgentsClient />
    </div>
  );
}
