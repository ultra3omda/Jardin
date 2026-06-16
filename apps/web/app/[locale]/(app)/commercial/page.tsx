import { CommercialOrgsList } from './commercial-orgs';

export const dynamic = 'force-dynamic';

export default function CommercialPage() {
  // Header (title + "Nouvelle organisation" action) is rendered by the
  // ResourceListPage inside <CommercialOrgsList />.
  return (
    <div className="mx-auto max-w-5xl py-2">
      <CommercialOrgsList />
    </div>
  );
}
