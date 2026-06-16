import { PageHeader } from '@/components/ui/page-header';
import { InviteTokensList } from './invite-tokens-list';

export const dynamic = 'force-dynamic';

export default function AdminInviteTokensPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description="Gérez les tokens d'invitation pour les nouveaux utilisateurs."
      />
      <InviteTokensList />
    </div>
  );
}
