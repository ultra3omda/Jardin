import { CreateOrganizationForm } from './create-organization-form';

export const dynamic = 'force-dynamic';

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle organisation signée</h1>
        <p className="text-sm text-muted-foreground">
          Rattachez le contrat signé, créez l&apos;établissement et invitez son administrateur.
        </p>
      </header>
      <CreateOrganizationForm />
    </div>
  );
}
