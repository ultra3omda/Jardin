import { InviteTokensList } from './invite-tokens-list';

export const dynamic = 'force-dynamic';

export default function AdminInviteTokensPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          Gérez les tokens d&apos;invitation pour les nouveaux utilisateurs.
        </p>
      </header>
      <InviteTokensList />
    </div>
  );
}
