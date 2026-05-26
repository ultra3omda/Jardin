import { CreateTenantForm } from './create-tenant-form';

export const dynamic = 'force-dynamic';

export default function NewTenantPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Nouvelle école</h1>
        <p className="text-sm text-muted-foreground">
          Crée le tenant + un email d&apos;invitation pour l&apos;administrateur.
        </p>
      </header>
      <CreateTenantForm />
    </div>
  );
}
