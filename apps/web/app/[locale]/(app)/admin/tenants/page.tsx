import { TenantsList } from './tenants-list';

export const dynamic = 'force-dynamic';

export default function AdminTenantsPage() {
  // Header (title + "+ Nouvelle école" action) is rendered by the
  // ResourceListPage inside <TenantsList />.
  return (
    <div className="space-y-6">
      <TenantsList />
    </div>
  );
}
