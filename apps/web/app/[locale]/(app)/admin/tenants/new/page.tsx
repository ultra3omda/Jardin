import { PageHeader } from '@/components/ui/page-header';
import { CreateTenantForm } from './create-tenant-form';

export const dynamic = 'force-dynamic';

export default function NewTenantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nouvelle école"
        description="Crée le tenant + un email d'invitation pour l'administrateur."
      />
      <CreateTenantForm />
    </div>
  );
}
