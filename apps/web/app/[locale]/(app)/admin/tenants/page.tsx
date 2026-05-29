import { Link } from '@/i18n/routing';

import { TenantsList } from './tenants-list';

export const dynamic = 'force-dynamic';

export default function AdminTenantsPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Écoles</h1>
          <p className="text-sm text-muted-foreground">
            Liste des établissements sur la plateforme Klasso.
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Nouvelle école
        </Link>
      </header>
      <TenantsList />
    </div>
  );
}
