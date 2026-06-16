import { PageHeader } from '@/components/ui/page-header';
import { CreateOrganizationForm } from './create-organization-form';

export const dynamic = 'force-dynamic';

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <PageHeader
        title="Nouvelle organisation signée"
        description="Rattachez le contrat signé, créez l'établissement et invitez son administrateur."
      />
      <CreateOrganizationForm />
    </div>
  );
}
